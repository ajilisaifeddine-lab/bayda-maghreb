import { describe, it, expect } from "vitest";
import {
  PackStore,
  createMemoryBackend,
  createIndexedDbBackend,
  compareSemver,
  findUpdates,
  MAX_STORED,
} from "../apps/web-lab/store";
import type { Catalog } from "../apps/web-lab/downloader";

const REL = "v1.0.0";
const mk = (id: string, version = "1.0.0") => ({
  manifest: { id, version, name: "T" },
  keywords: { ekteb: "print" },
  vocabulary: { salam: "سلام" },
});
const rec = (id: string, version = "1.0.0", extra: Record<string, unknown> = {}) => ({
  id,
  release: REL,
  version,
  savedAt: 1,
  pack: mk(id, version),
  ...extra,
});

describe("تخزين حزم اللهجات", () => {
  it("حفظ ثم قراءة: يعيد الحزمة نفسها ويحفظها دائماً", async () => {
    const b = createMemoryBackend();
    const s = new PackStore(b);
    expect(await s.save("tn-latn", mk("tn-latn"), REL, "1.0.0")).toEqual({ ok: true, persistent: true });
    const l = await s.load("tn-latn");
    expect(l.ok).toBe(true);
    if (l.ok) {
      expect(l.stored.pack.keywords.ekteb).toBe("print");
      expect(l.stored.release).toBe(REL);
      expect(l.stored.version).toBe("1.0.0");
    }
    expect(b.raw.has("tn-latn")).toBe(true);
    expect(s.memoryOnlyIds()).toEqual([]);
  });

  it("المقروء نسخة نظيفة بلا نموذج أولي، ومفاتيح manifest غير المعروفة تُهمَل", async () => {
    const s = new PackStore(createMemoryBackend());
    const withExtra = { ...mk("tn-latn"), manifest: { ...mk("tn-latn").manifest, extra: { deep: 1 } } };
    await s.save("tn-latn", withExtra, REL, "1.0.0");
    const l = await s.load("tn-latn");
    expect(l.ok).toBe(true);
    if (l.ok) {
      expect(Object.getPrototypeOf(l.stored.pack.keywords)).toBeNull();
      expect("extra" in l.stored.pack.manifest).toBe(false);
    }
  });

  it("حزمة غير صالحة تُرفض ولا تُخزَّن", async () => {
    const b = createMemoryBackend();
    const s = new PackStore(b);
    const bad = { ...mk("tn-latn"), vocabulary: { "<script>": "x" } };
    expect((await s.save("tn-latn", bad, REL, "1.0.0")).ok).toBe(false);
    expect(b.raw.size).toBe(0);
    expect(s.memoryOnlyIds()).toEqual([]);
  });

  it("معرّف الحزمة أو الإصدار أو اسم اللهجة غير الصالح يُرفض", async () => {
    const s = new PackStore(createMemoryBackend());
    expect((await s.save("aa-latn", mk("bb-latn"), REL, "1.0.0")).ok).toBe(false);
    expect((await s.save("aa-latn", mk("aa-latn"), "latest", "1.0.0")).ok).toBe(false);
    expect((await s.save("aa-latn", mk("aa-latn"), REL, "x")).ok).toBe(false);
    for (const id of ["../x", "a/b", "", "-a"]) {
      expect((await s.save(id, mk("aa-latn"), REL, "1.0.0")).ok, id).toBe(false);
    }
  });

  it("فشل الكتابة الدائمة: تعمل اللهجة في الذاكرة ويبقى القديم على القرص", async () => {
    const opts = { failPut: false };
    const b = createMemoryBackend(opts);
    const s = new PackStore(b);
    await s.save("tn-latn", mk("tn-latn", "1.0.0"), REL, "1.0.0");
    opts.failPut = true;
    expect(await s.save("tn-latn", mk("tn-latn", "1.1.0"), REL, "1.1.0")).toEqual({ ok: true, persistent: false });
    expect(s.memoryOnlyIds()).toEqual(["tn-latn"]);
    const l = await s.load("tn-latn");
    expect(l.ok && l.stored.version).toBe("1.1.0");
    expect((b.raw.get("tn-latn") as { version: string }).version).toBe("1.0.0");
  });

  it("سجل معطوب أو متلاعَب به يُحذف ولا يُستعمل", async () => {
    const b = createMemoryBackend();
    const s = new PackStore(b);
    const cases: unknown[] = [
      "نص",
      5,
      rec("tn-latn", "1.0.0", { id: "dz-latn" }),
      rec("tn-latn", "1.0.0", { version: "9.9.9" }),
      rec("tn-latn", "1.0.0", { release: "latest" }),
      rec("tn-latn", "1.0.0", { savedAt: "x" }),
      rec("tn-latn", "1.0.0", { pack: { ...mk("tn-latn"), vocabulary: { "<script>": "x" } } }),
      rec("tn-latn", "1.0.0", { pack: { manifest: mk("tn-latn").manifest } }),
    ];
    for (const c of cases) {
      b.raw.set("tn-latn", c);
      expect((await s.load("tn-latn")).ok).toBe(false);
      expect(b.raw.has("tn-latn")).toBe(false);
    }
  });

  it("تحميل الكل: المفاتيح الغريبة تُحذف والزائد عن الحد يُقصّ", async () => {
    const b = createMemoryBackend();
    const s = new PackStore(b);
    b.raw.set("../x", rec("aa-latn"));
    for (let i = 0; i < MAX_STORED + 8; i++) b.raw.set("d" + i, rec("d" + i));
    const all = await s.loadAll();
    expect(all.length).toBe(MAX_STORED);
    expect(b.raw.has("../x")).toBe(false);
    expect(b.raw.size).toBe(MAX_STORED);
  });

  it("تعذّر القراءة من الجهاز: غير متاح بلا خطأ، وتحميل الكل لا يرمي", async () => {
    const opts = { failGet: false, failKeys: false };
    const b = createMemoryBackend(opts);
    await new PackStore(b).save("tn-latn", mk("tn-latn"), REL, "1.0.0");
    opts.failGet = true;
    expect(await new PackStore(b).load("tn-latn")).toEqual({ ok: false, reason: "unavailable" });
    opts.failGet = false;
    opts.failKeys = true;
    expect(await new PackStore(b).loadAll()).toEqual([]);
  });

  it("بلا IndexedDB: تعمل اللهجة في الذاكرة لهذه الجلسة فقط", async () => {
    const s = new PackStore(null);
    expect(s.hasBackend()).toBe(false);
    expect(await s.save("tn-latn", mk("tn-latn"), REL, "1.0.0")).toEqual({ ok: true, persistent: false });
    expect((await s.load("tn-latn")).ok).toBe(true);
    expect((await s.loadAll()).length).toBe(1);
    expect(s.memoryOnlyIds()).toEqual(["tn-latn"]);
  });

  it("حد عدد اللهجات المخزّنة: الجديدة تُرفض والاستبدال مسموح", async () => {
    const s = new PackStore(createMemoryBackend());
    for (let i = 0; i < MAX_STORED; i++) {
      expect((await s.save("d" + i, mk("d" + i), REL, "1.0.0")).ok).toBe(true);
    }
    expect((await s.save("extra", mk("extra"), REL, "1.0.0")).ok).toBe(false);
    expect((await s.save("d0", mk("d0", "1.0.1"), REL, "1.0.1")).ok).toBe(true);
  });

  it("الحذف يزيل الحزمة من القرص والذاكرة", async () => {
    const opts = { failPut: false };
    const b = createMemoryBackend(opts);
    const s = new PackStore(b);
    await s.save("tn-latn", mk("tn-latn"), REL, "1.0.0");
    opts.failPut = true;
    await s.save("dz-latn", mk("dz-latn"), REL, "1.0.0");
    expect(await s.remove("tn-latn")).toBe(true);
    expect(await s.remove("dz-latn")).toBe(true);
    expect(await s.remove("../x")).toBe(false);
    expect(b.raw.size).toBe(0);
    expect((await s.load("dz-latn")).ok).toBe(false);
  });

  it("مقارنة الإصدارات رقمياً", () => {
    expect(compareSemver("1.9.0", "1.10.0")).toBe(-1);
    expect(compareSemver("2.0.0", "1.99.99")).toBe(1);
    expect(compareSemver("1.0.0", "1.0.0")).toBe(0);
    expect(compareSemver("1.0", "1.0.0")).toBeNull();
    expect(compareSemver("latest", "1.0.0")).toBeNull();
  });

  it("اكتشاف التحديثات: الأقدم فقط، وتُهمل غير المعروفة والمعطوبة", () => {
    const cat = {
      schema: 1,
      release: "v2.0.0",
      dialects: { "tn-latn": { version: "1.2.0", files: {} }, "dz-latn": { version: "1.0.0", files: {} } },
    } as unknown as Catalog;
    const r = findUpdates(cat, [
      { id: "tn-latn", version: "1.1.0" },
      { id: "dz-latn", version: "1.0.0" },
      { id: "ly-latn", version: "1.0.0" },
      { id: "tn-latn", version: "bad" },
    ]);
    expect(r).toEqual([{ id: "tn-latn", from: "1.1.0", to: "1.2.0" }]);
  });

  it("في بيئة بلا IndexedDB (Node) لا منفذ دائم", () => {
    expect(createIndexedDbBackend()).toBeNull();
  });
});
