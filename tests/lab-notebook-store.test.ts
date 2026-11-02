import { describe, it, expect } from "vitest";
import { buildSync } from "esbuild";
import { Notebook, STORAGE_KEY, type KeyValueStorage } from "../apps/web-lab/notebook-store";
import { LIMITS } from "../apps/web-lab/notebook";

const NOW = 1000000000000;
const DAY = 86400000;

function mem(initial?: string) {
  const data = new Map<string, string>();
  if (initial !== undefined) data.set(STORAGE_KEY, initial);
  const o = { failSet: false, failGet: false };
  const s: KeyValueStorage = {
    getItem: (k: string) => {
      if (o.failGet) throw new Error("get");
      const v = data.get(k);
      return v === undefined ? null : v;
    },
    setItem: (k: string, v: string) => {
      if (o.failSet) throw new Error("quota");
      data.set(k, v);
    },
  };
  return { s, data, o };
}
const word = (w: string, extra: Record<string, unknown> = {}): Record<string, unknown> => ({
  type: "word",
  dialect: "tn-latn",
  word: w,
  meaning: "م",
  ...extra,
});
const text = (t: string, body = "b"): Record<string, unknown> => ({ type: "text", title: t, body });

describe("دفتر المتعلم: الحالة والتخزين", () => {
  it("إضافة ثم إعادة فتح الدفتر: تبقى السجلات", () => {
    const m = mem();
    const a = new Notebook(m.s, () => NOW);
    const r = a.add(word("salam"));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.persistent).toBe(true);
    const b = new Notebook(m.s, () => NOW);
    expect(b.entries().length).toBe(1);
    expect(b.entries()[0].word).toBe("salam");
  });

  it("الكلمة المكررة (نفس اللهجة) تُرفض، ولهجة أخرى أو نوع آخر مسموح", () => {
    const nb = new Notebook(null, () => NOW);
    expect(nb.add(word("salam")).ok).toBe(true);
    const dup = nb.add(word("salam"));
    expect(dup.ok).toBe(false);
    if (!dup.ok) expect(dup.error).toContain("محفوظة");
    expect(nb.add(word("SALAM")).ok).toBe(false);
    expect(nb.add(word("salam", { dialect: "dz-latn" })).ok).toBe(true);
    expect(nb.add({ type: "code", title: "salam", body: "x" }).ok).toBe(true);
  });

  it("سجل غير صالح لا يُخزَّن", () => {
    const m = mem();
    const nb = new Notebook(m.s, () => NOW);
    expect(nb.add({ type: "word", word: "x" }).ok).toBe(false);
    expect(m.data.has(STORAGE_KEY)).toBe(false);
  });

  it("حد عدد السجلات", () => {
    const nb = new Notebook(mem().s, () => NOW);
    for (let i = 0; i < LIMITS.entries; i++) expect(nb.add(text("t" + i)).ok).toBe(true);
    const over = nb.add(text("extra"));
    expect(over.ok).toBe(false);
    if (!over.ok) expect(over.error).toContain("ممتلئ");
  });

  it("حد الحجم: المحفوظ يبقى قابلاً للتحميل", () => {
    const m = mem();
    const nb = new Notebook(m.s, () => NOW);
    let last = "";
    for (let i = 0; i < LIMITS.entries; i++) {
      const r = nb.add({ type: "text", title: "t" + i, body: "x".repeat(LIMITS.body) });
      if (!r.ok) {
        last = r.error;
        break;
      }
    }
    expect(last).toContain("الحجم");
    expect((m.data.get(STORAGE_KEY) ?? "").length).toBeLessThanOrEqual(LIMITS.importBytes);
    expect(new Notebook(m.s, () => NOW).entries().length).toBeGreaterThan(0);
  });

  it("المراجعة تُحفظ، والمجهول أو غير الكلمة يُرفض", () => {
    const m = mem();
    const nb = new Notebook(m.s, () => NOW);
    const a = nb.add(word("salam"));
    if (!a.ok) throw new Error(a.error);
    expect(nb.review(a.entry.id, true).ok).toBe(true);
    expect(new Notebook(m.s, () => NOW).entries()[0].box).toBe(2);
    expect(nb.review(a.entry.id, false).ok).toBe(true);
    expect(nb.entries()[0].box).toBe(1);
    expect(nb.review("nope", true).ok).toBe(false);
    const t = nb.add(text("t"));
    if (!t.ok) throw new Error(t.error);
    expect(nb.review(t.entry.id, true).ok).toBe(false);
  });

  it("الحذف يُحفظ، والمجهول يُرفض", () => {
    const m = mem();
    const nb = new Notebook(m.s, () => NOW);
    const a = nb.add(text("t"));
    if (!a.ok) throw new Error(a.error);
    expect(nb.remove("nope").ok).toBe(false);
    expect(nb.remove(a.entry.id).ok).toBe(true);
    expect(new Notebook(m.s, () => NOW).entries().length).toBe(0);
  });

  it("المستحق والعدّادات تتبع الساعة", () => {
    let t = NOW;
    const nb = new Notebook(mem().s, () => t);
    nb.add(word("salam"));
    nb.add({ type: "code", title: "c", body: "x", target: "js" });
    nb.add(text("n"));
    expect(nb.counts()).toEqual({ total: 3, words: 1, code: 1, text: 1, due: 1 });
    const w = nb.entries().find((e) => e.type === "word");
    if (!w) throw new Error("no word");
    expect(nb.review(w.id, true).ok).toBe(true);
    expect(nb.counts().due).toBe(0);
    t = NOW + 2 * DAY;
    expect(nb.counts().due).toBe(1);
    expect(nb.due().length).toBe(1);
  });

  it("البحث والمرشحات", () => {
    const nb = new Notebook(null, () => NOW);
    nb.add(word("salam"));
    nb.add({ type: "code", title: "مثال", body: 'goul("x")', dialect: "tn-latn" });
    expect(nb.search({ type: "code" }).length).toBe(1);
    expect(nb.search({ q: "SALAM" }).length).toBe(1);
    expect(nb.search({}).length).toBe(2);
  });

  it("تصدير ثم استيراد: يُدمج بلا تكرار ويرفض التالف", () => {
    const a = new Notebook(mem().s, () => NOW);
    a.add(word("salam"));
    a.add(text("درس", "نص"));
    const exp = a.exportText();
    const b = new Notebook(mem().s, () => NOW);
    expect(b.importText(exp)).toMatchObject({ ok: true, added: 2, skipped: 0 });
    expect(b.importText(exp)).toMatchObject({ ok: true, added: 0, dropped: 2 });
    expect(b.importText("{bad").ok).toBe(false);
    expect(b.entries().length).toBe(2);
  });

  it("تخزين تالف: يبدأ فارغاً بلا خطأ ويُستبدل عند أول حفظ", () => {
    const m = mem("{bad");
    const nb = new Notebook(m.s, () => NOW);
    expect(nb.entries()).toEqual([]);
    expect(nb.isLocked()).toBe(false);
    expect(nb.add(text("t")).ok).toBe(true);
    expect(new Notebook(m.s, () => NOW).entries().length).toBe(1);
  });

  it("دفتر بإصدار أحدث: مقفل ولا يُكتب فوقه", () => {
    const initial = JSON.stringify({ app: "bayda-notebook", schema: 2, entries: [] });
    const m = mem(initial);
    const nb = new Notebook(m.s, () => NOW);
    expect(nb.isLocked()).toBe(true);
    const r = nb.add(text("t"));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("حدّث");
    expect(m.data.get(STORAGE_KEY)).toBe(initial);
  });

  it("سجلات متلاعَب بها تُتخطى، ونص يشبه HTML يُحفظ نصاً", () => {
    const raw = JSON.stringify({
      app: "bayda-notebook",
      schema: 1,
      entries: [
        { type: "text", title: "ok", body: "b", id: "a1" },
        { type: "bogus" },
        { type: "text", title: "<img src=x onerror=alert(1)>", body: "b", id: "a2" },
      ],
    });
    const nb = new Notebook(mem(raw).s, () => NOW);
    const list = nb.entries();
    expect(list.length).toBe(2);
    expect(list[1].title).toBe("<img src=x onerror=alert(1)>");
  });

  it("فشل الكتابة: السجل يبقى في الذاكرة مع تنبيه ثم يُحفظ لاحقاً", () => {
    const m = mem();
    const nb = new Notebook(m.s, () => NOW);
    m.o.failSet = true;
    const r = nb.add(word("a"));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.persistent).toBe(false);
    expect(nb.entries().length).toBe(1);
    expect(nb.isPersistent()).toBe(false);
    m.o.failSet = false;
    expect(nb.add(word("b"))).toMatchObject({ ok: true, persistent: true });
    expect(new Notebook(m.s, () => NOW).entries().length).toBe(2);
  });

  it("بلا تخزين: يعمل في الذاكرة فقط", () => {
    const nb = new Notebook(null, () => NOW);
    expect(nb.add(word("a"))).toMatchObject({ ok: true, persistent: false });
    expect(nb.entries().length).toBe(1);
  });

  it("تعذّر القراءة من التخزين: لا يرمي ويبدأ فارغاً", () => {
    const m = mem();
    m.o.failGet = true;
    const nb = new Notebook(m.s, () => NOW);
    expect(nb.entries()).toEqual([]);
    expect(nb.isPersistent()).toBe(false);
  });

  it("المُعاد نسخ: تعديلها لا يغيّر الحالة الداخلية", () => {
    const nb = new Notebook(null, () => NOW);
    nb.add(word("salam"));
    const e = nb.entries();
    e[0].word = "hacked";
    e.push(e[0]);
    expect(nb.entries().length).toBe(1);
    expect(nb.entries()[0].word).toBe("salam");
  });

  it("حزمة المختبر تعرّف BaydaNotebook", () => {
    const r = buildSync({
      entryPoints: ["apps/web-lab/app.ts"],
      bundle: true,
      minify: true,
      format: "iife",
      target: "es2019",
      platform: "browser",
      define: { __LOCAL_SOURCES__: "false" },
      write: false,
      logLevel: "silent",
    });
    expect(r.outputFiles[0].text).toContain("BaydaNotebook");
  });
});
