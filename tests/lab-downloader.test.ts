import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { downloadDialect, validateCatalog, SOURCES } from "../apps/web-lab/downloader";

type Route = { status?: number; body: Uint8Array; headers?: Record<string, string> };
type Routes = Record<string, Route>;
type Call = { url: string; init?: RequestInit };

const sha = async (b: ArrayBuffer): Promise<string> => crypto.createHash("sha256").update(Buffer.from(b)).digest("hex");
const hashOf = (b: Uint8Array): string => crypto.createHash("sha256").update(Buffer.from(b)).digest("hex");
const enc = (s: string): Uint8Array => new TextEncoder().encode(s);

function fakeFetch(routes: Routes, log: Call[] = []) {
  return async (url: string, init?: RequestInit): Promise<Response> => {
    log.push({ url, init });
    const r = routes[url];
    if (!r) return new Response("nope", { status: 404 });
    return new Response(r.body, { status: r.status ?? 200, headers: r.headers });
  };
}

const root = path.join(process.cwd(), "packages");
function realServer() {
  const catText = fs.readFileSync(path.join(root, "catalog.json"), "utf8");
  const cat = JSON.parse(catText);
  const routes: Routes = { [SOURCES.catalogUrl]: { body: enc(catText) } };
  for (const id of Object.keys(cat.dialects)) {
    for (const f of Object.keys(cat.dialects[id].files)) {
      routes[SOURCES.fileUrl(cat.release, id, f)] = { body: new Uint8Array(fs.readFileSync(path.join(root, id, f))) };
    }
  }
  return { cat, routes };
}

type Pack = { manifest: object; keywords: object; vocabulary: object };
function craft(
  dialects: Record<string, Pack>,
  over: { schema?: number; release?: string; rawKeywords?: string; catalogVersion?: string } = {}
) {
  const release = over.release ?? "v9.9.9";
  const cat: { schema: number; release: string; dialects: Record<string, unknown> } = {
    schema: over.schema ?? 1,
    release,
    dialects: {},
  };
  const routes: Routes = {};
  for (const [id, p] of Object.entries(dialects)) {
    const texts: Array<[string, string]> = [
      ["manifest.json", JSON.stringify(p.manifest)],
      ["keywords.json", over.rawKeywords ?? JSON.stringify(p.keywords)],
      ["vocabulary.json", JSON.stringify(p.vocabulary)],
    ];
    const files: Record<string, { sha256: string; bytes: number }> = {};
    for (const [f, t] of texts) {
      const b = enc(t);
      files[f] = { sha256: hashOf(b), bytes: b.length };
      routes[SOURCES.fileUrl(release, id, f)] = { body: b };
    }
    cat.dialects[id] = { version: over.catalogVersion ?? "1.0.0", files };
  }
  routes[SOURCES.catalogUrl] = { body: enc(JSON.stringify(cat)) };
  return routes;
}

const okPack = (id: string, version = "1.0.0"): Pack => ({
  manifest: { id, version, name: "T" },
  keywords: { ekteb: "print" },
  vocabulary: { salam: "سلام" },
});

describe("المنزِّل: حزم اللهجات", () => {
  it("ينزّل كل لهجات المستودع ويفحصها بنجاح", async () => {
    const { cat, routes } = realServer();
    for (const id of Object.keys(cat.dialects)) {
      const r = await downloadDialect(id, { fetchFn: fakeFetch(routes), sha256: sha });
      expect(r.ok, id + ": " + (r.ok ? "" : r.error)).toBe(true);
      if (r.ok) {
        expect(r.pack.manifest.id).toBe(id);
        expect(r.version).toBe(cat.dialects[id].version);
        const kw = JSON.parse(fs.readFileSync(path.join(root, id, "keywords.json"), "utf8"));
        expect(Object.keys(r.pack.keywords).length).toBe(Object.keys(kw).length);
      }
    }
  });

  it("الفهرس من GitHub طازجاً، والملفات من jsDelivr بإصدار ثابت", async () => {
    const { routes } = realServer();
    const log: Call[] = [];
    const r = await downloadDialect("tn-latn", { fetchFn: fakeFetch(routes, log), sha256: sha });
    expect(r.ok).toBe(true);
    expect(log[0].url).toBe(SOURCES.catalogUrl);
    expect(log[0].init?.cache).toBe("no-store");
    expect(log.length).toBe(4);
    for (const c of log.slice(1)) {
      expect(c.url).toMatch(/^https:\/\/cdn\.jsdelivr\.net\/gh\/[^@]+@v\d+\.\d+\.\d+\/packages\/tn-latn\/[a-z]+\.json$/);
    }
  });

  it("كل الطلبات GET بلا كوكيز ولا مرجع", async () => {
    const { routes } = realServer();
    const log: Call[] = [];
    await downloadDialect("tn-latn", { fetchFn: fakeFetch(routes, log), sha256: sha });
    for (const c of log) {
      expect(c.init?.method).toBe("GET");
      expect(c.init?.credentials).toBe("omit");
      expect(c.init?.referrerPolicy).toBe("no-referrer");
    }
  });

  it("بصمة غير مطابقة (بنفس الحجم) تُرفض", async () => {
    const { cat, routes } = realServer();
    const key = SOURCES.fileUrl(cat.release, "tn-latn", "keywords.json");
    const b = Uint8Array.from(routes[key].body);
    b[2] = b[2] ^ 1;
    routes[key] = { body: b };
    const r = await downloadDialect("tn-latn", { fetchFn: fakeFetch(routes), sha256: sha });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("بصمة");
  });

  it("حجم أكبر أو أصغر مما في الفهرس يُرفض", async () => {
    const { cat, routes } = realServer();
    const key = SOURCES.fileUrl(cat.release, "tn-latn", "keywords.json");
    const orig = routes[key].body;
    routes[key] = { body: new Uint8Array([...orig, 32]) };
    const big = await downloadDialect("tn-latn", { fetchFn: fakeFetch(routes), sha256: sha });
    expect(big.ok).toBe(false);
    if (!big.ok) expect(big.error).toContain("حجم");
    routes[key] = { body: orig.slice(0, orig.length - 1) };
    const small = await downloadDialect("tn-latn", { fetchFn: fakeFetch(routes), sha256: sha });
    expect(small.ok).toBe(false);
    if (!small.ok) expect(small.error).toContain("حجم");
  });

  it("خطأ HTTP يُرفض برمز الحالة", async () => {
    const { cat, routes } = realServer();
    delete routes[SOURCES.fileUrl(cat.release, "tn-latn", "vocabulary.json")];
    const r = await downloadDialect("tn-latn", { fetchFn: fakeFetch(routes), sha256: sha });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("404");
  });

  it("Content-Length أكبر من الحد يُرفض", async () => {
    const { cat, routes } = realServer();
    const key = SOURCES.fileUrl(cat.release, "tn-latn", "keywords.json");
    routes[key] = { body: routes[key].body, headers: { "content-length": "999999999" } };
    const r = await downloadDialect("tn-latn", { fetchFn: fakeFetch(routes), sha256: sha });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("حجم");
  });

  it("فهرس بإصدار schema أحدث: يُطلب تحديث التطبيق", async () => {
    const routes = craft({ "aa-latn": okPack("aa-latn") }, { schema: 2 });
    const r = await downloadDialect("aa-latn", { fetchFn: fakeFetch(routes), sha256: sha });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("حدّث");
  });

  it("اسم لهجة غير آمن لا يستدعي الشبكة", async () => {
    const log: Call[] = [];
    for (const id of ["../x", "a/b", "", "-a", "a b"]) {
      const r = await downloadDialect(id, { fetchFn: fakeFetch({}, log), sha256: sha });
      expect(r.ok, id).toBe(false);
    }
    expect(log.length).toBe(0);
  });

  it("لهجة غير موجودة في الفهرس", async () => {
    const { routes } = realServer();
    const r = await downloadDialect("zz-latn", { fetchFn: fakeFetch(routes), sha256: sha });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("غير موجودة");
  });

  it("وسم إصدار غير آمن في الفهرس يُرفض قبل أي تنزيل", async () => {
    const log: Call[] = [];
    const routes = craft({ "aa-latn": okPack("aa-latn") }, { release: "v1.0.0/../../x" });
    const r = await downloadDialect("aa-latn", { fetchFn: fakeFetch(routes, log), sha256: sha });
    expect(r.ok).toBe(false);
    expect(log.length).toBe(1);
  });

  it("حزمة معرّفها يخالف اللهجة المطلوبة تُرفض", async () => {
    const routes = craft({ "aa-latn": okPack("bb-latn") });
    const r = await downloadDialect("aa-latn", { fetchFn: fakeFetch(routes), sha256: sha });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("معرّف");
  });

  it("إصدار الحزمة يخالف الفهرس فتُرفض", async () => {
    const routes = craft({ "aa-latn": okPack("aa-latn", "1.0.1") }, { catalogVersion: "1.0.0" });
    const r = await downloadDialect("aa-latn", { fetchFn: fakeFetch(routes), sha256: sha });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("إصدار");
  });

  it("حزمة بمفتاح __proto__ تُرفض حتى لو طابقت البصمة", async () => {
    const routes = craft({ "aa-latn": okPack("aa-latn") }, { rawKeywords: '{"__proto__":"print"}' });
    const r = await downloadDialect("aa-latn", { fetchFn: fakeFetch(routes), sha256: sha });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("الحزمة مرفوضة");
  });

  it("تعذّر حساب البصمة: لا قبول", async () => {
    const { routes } = realServer();
    const r = await downloadDialect("tn-latn", {
      fetchFn: fakeFetch(routes),
      sha256: async () => {
        throw new Error("no subtle");
      },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("البصمة");
  });

  it("المهلة: اتصال معلّق يُقطع برسالة واضحة", async () => {
    const hang = (_u: string, init?: RequestInit) =>
      new Promise<Response>((_res, rej) => {
        init?.signal?.addEventListener("abort", () => rej(Object.assign(new Error("aborted"), { name: "AbortError" })));
      });
    const r = await downloadDialect("tn-latn", { fetchFn: hang, sha256: sha, timeoutMs: 30 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("مهلة");
  });

  it("validateCatalog: يقبل فهرس المستودع ويرفض التالف", () => {
    const { cat } = realServer();
    expect(validateCatalog(cat).ok).toBe(true);
    for (const bad of [null, "x", [], {}, { schema: 1, release: "v1.0.0", dialects: [] }]) {
      expect(validateCatalog(bad).ok).toBe(false);
    }
    const copy = JSON.parse(JSON.stringify(cat));
    copy.dialects["tn-latn"].files["keywords.json"].sha256 = "xyz";
    expect(validateCatalog(copy).ok).toBe(false);
    const copy2 = JSON.parse(JSON.stringify(cat));
    delete copy2.dialects["tn-latn"].files["vocabulary.json"];
    expect(validateCatalog(copy2).ok).toBe(false);
    const copy3 = JSON.parse(JSON.stringify(cat));
    copy3.dialects["../x"] = copy3.dialects["tn-latn"];
    expect(validateCatalog(copy3).ok).toBe(false);
  });
});
