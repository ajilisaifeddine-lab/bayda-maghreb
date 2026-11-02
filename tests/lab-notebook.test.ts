import { describe, it, expect } from "vitest";
import {
  createEntry,
  validateEntry,
  review,
  dueEntries,
  filterEntries,
  exportNotebook,
  parseImport,
  mergeEntries,
  LIMITS,
  INTERVAL_DAYS,
  type NotebookEntry,
} from "../apps/web-lab/notebook";

const NOW = 1000000000000;
const DAY = 86400000;
const gen = () => {
  let n = 0;
  return () => "id" + String(++n);
};
function mk(input: Record<string, unknown>, g: () => string = gen()): NotebookEntry {
  const r = createEntry(input, NOW, g);
  if (!r.ok) throw new Error(r.error);
  return r.entry;
}
const ok = (i: Record<string, unknown>) => expect(createEntry(i, NOW).ok).toBe(true);
const bad = (i: Record<string, unknown>) => expect(createEntry(i, NOW).ok).toBe(false);

describe("دفتر المتعلم", () => {
  it("كلمة: تُنشأ بعنوان الكلمة وصندوق 1 ومستحقة الآن", () => {
    const e = mk({ type: "word", dialect: "tn-latn", word: "salam", meaning: "سلام" });
    expect(e.title).toBe("salam");
    expect(e.box).toBe(1);
    expect(e.due).toBe(NOW);
    expect(e.created).toBe(NOW);
    expect(e.id).toBe("id1");
    expect(e.target).toBe("");
  });

  it("كود ونص: الهدف يُحفظ للكود فقط", () => {
    expect(mk({ type: "code", title: "مثالي", body: 'goul("x")', target: "js", dialect: "tn-latn" }).target).toBe("js");
    expect(mk({ type: "text", title: "ملاحظة", body: "نص", target: "py" }).target).toBe("");
    expect(mk({ type: "code", title: "x", body: "y" }).target).toBe("");
  });

  it("الحقول المطلوبة والقيم غير الصالحة تُرفض", () => {
    bad({ type: "word", word: "salam" });
    bad({ type: "word", meaning: "سلام" });
    bad({ type: "word", word: "\u202E", meaning: "m" });
    bad({ type: "text", body: "b" });
    bad({ type: "text", title: "t" });
    bad({ type: "other", title: "t", body: "b" });
    bad({ type: "text", title: "t", body: "b", dialect: "../x" });
    bad({ type: "code", title: "t", body: "b", target: "rb" });
    bad({ type: "text", title: 5, body: "b" });
    bad({ type: "text", title: "t", body: {} });
  });

  it("الحدود: عند الحد مقبول وفوقه مرفوض", () => {
    ok({ type: "word", word: "a".repeat(LIMITS.word), meaning: "m" });
    bad({ type: "word", word: "a".repeat(LIMITS.word + 1), meaning: "m" });
    ok({ type: "word", word: "w", meaning: "m".repeat(LIMITS.meaning) });
    bad({ type: "word", word: "w", meaning: "m".repeat(LIMITS.meaning + 1) });
    ok({ type: "text", title: "t".repeat(LIMITS.title), body: "b" });
    bad({ type: "text", title: "t".repeat(LIMITS.title + 1), body: "b" });
    ok({ type: "text", title: "t", body: "b".repeat(LIMITS.body) });
    bad({ type: "text", title: "t", body: "b".repeat(LIMITS.body + 1) });
  });

  it("تنقية النص: أحرف التحكم والاتجاه تُزال، والأسطر والتطبيع", () => {
    expect(mk({ type: "word", word: "sa\u202Elam", meaning: "m" }).word).toBe("salam");
    expect(mk({ type: "word", word: "sa\u200Elam\u2066", meaning: "m" }).word).toBe("salam");
    expect(mk({ type: "text", title: "a\nb\tc", body: "b" }).title).toBe("a b c");
    expect(mk({ type: "text", title: "t", body: "l1\r\nl2\u0000\rl3" }).body).toBe("l1\nl2\nl3");
    expect(mk({ type: "text", title: "  t  ", body: "  b  " }).title).toBe("t");
    expect(mk({ type: "word", word: "e\u0301", meaning: "m" }).word).toBe("\u00e9");
  });

  it("الناتج نظيف: مفاتيح معروفة فقط بلا تلويث نموذج أولي", () => {
    const raw = JSON.parse(
      '{"type":"text","title":"t","body":"b","extra":"x","__proto__":{"polluted":true},"constructor":"c","id":"bad id!"}'
    );
    const r = validateEntry(raw, NOW, gen());
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(Object.keys(r.entry).sort()).toEqual([
        "body", "box", "created", "dialect", "due", "id", "meaning", "target", "title", "type", "word",
      ]);
      expect(r.entry.id).toBe("id1");
      expect((r.entry as unknown as Record<string, unknown>).polluted).toBeUndefined();
    }
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it("مدخلات غريبة لا ترمي", () => {
    for (const x of [null, undefined, 5, "x", [], {}, () => 1, Symbol("s")]) {
      expect(() => validateEntry(x, NOW)).not.toThrow();
      expect(validateEntry(x, NOW).ok).toBe(false);
    }
  });

  it("المراجعة المتباعدة: الصناديق والمواعيد", () => {
    const e = mk({ type: "word", word: "w", meaning: "m" });
    const r2 = review(e, true, NOW);
    expect(r2.box).toBe(2);
    expect(r2.due).toBe(NOW + (INTERVAL_DAYS[1] ?? 0) * DAY);
    const r3 = review(r2, true, NOW);
    expect(r3.box).toBe(3);
    expect(r3.due).toBe(NOW + 3 * DAY);
    let x = e;
    for (let i = 0; i < 10; i++) x = review(x, true, NOW);
    expect(x.box).toBe(5);
    expect(x.due).toBe(NOW + 14 * DAY);
    const back = review(x, false, NOW);
    expect(back.box).toBe(1);
    expect(back.due).toBe(NOW);
    expect(e.box).toBe(1);
  });

  it("المستحقة اليوم: كلمات فقط مرتبة", () => {
    const g = gen();
    const a = { ...mk({ type: "word", word: "a", meaning: "m" }, g), due: NOW - 1000, box: 2 };
    const b = { ...mk({ type: "word", word: "b", meaning: "m" }, g), due: NOW - 5000, box: 4 };
    const c = { ...mk({ type: "word", word: "c", meaning: "m" }, g), due: NOW - 5000, box: 1 };
    const future = { ...mk({ type: "word", word: "d", meaning: "m" }, g), due: NOW + 1 };
    const code = { ...mk({ type: "code", title: "t", body: "b" }, g), due: NOW - 9999 };
    expect(dueEntries([a, b, c, future, code], NOW).map((e) => e.word)).toEqual(["c", "b", "a"]);
  });

  it("البحث والمرشحات", () => {
    const g = gen();
    const e1 = { ...mk({ type: "word", dialect: "tn-latn", word: "Salam", meaning: "سلام" }, g), created: 1 };
    const e2 = { ...mk({ type: "code", dialect: "dz-latn", title: "Hello", body: 'ktab("x")' }, g), created: 3 };
    const e3 = { ...mk({ type: "text", title: "درس", body: "مرحبا SALAM" }, g), created: 2 };
    const all = [e1, e2, e3];
    const ids = (l: NotebookEntry[]) => l.map((e) => e.id);
    expect(ids(filterEntries(all))).toEqual([e2.id, e3.id, e1.id]);
    expect(ids(filterEntries(all, { type: "word" }))).toEqual([e1.id]);
    expect(ids(filterEntries(all, { dialect: "dz-latn" }))).toEqual([e2.id]);
    expect(ids(filterEntries(all, { q: "salam" }))).toEqual([e3.id, e1.id]);
    expect(ids(filterEntries(all, { q: "سلام" }))).toEqual([e1.id]);
    expect(ids(filterEntries(all, { type: "code", q: "KTAB" }))).toEqual([e2.id]);
    expect(filterEntries(all, { q: "zzz" })).toEqual([]);
  });

  it("تصدير ثم استيراد: يعيد السجلات نفسها", () => {
    const g = gen();
    const list = [
      mk({ type: "word", dialect: "tn-latn", word: "salam", meaning: "سلام" }, g),
      mk({ type: "code", title: "t", body: 'goul("x")\nkteb("y")', target: "py" }, g),
      mk({ type: "text", title: "درس", body: "نص\nسطر" }, g),
    ];
    const r = parseImport(exportNotebook(list, NOW), NOW);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.entries).toEqual(list);
      expect(r.skipped).toBe(0);
    }
  });

  it("الاستيراد: يرفض التالف والأحدث والكبير", () => {
    const rej = (t: unknown) => expect(parseImport(t, NOW).ok).toBe(false);
    rej(5);
    rej("");
    rej("{");
    rej("[]");
    rej('{"app":"other","schema":1,"entries":[]}');
    rej('{"app":"bayda-notebook","schema":1}');
    rej('{"app":"bayda-notebook","entries":[]}');
    rej("x".repeat(LIMITS.importBytes + 1));
    const newer = parseImport('{"app":"bayda-notebook","schema":2,"entries":[]}', NOW);
    expect(newer.ok).toBe(false);
    if (!newer.ok) expect(newer.error).toContain("حدّث");
  });

  it("الاستيراد: يتخطى التالف والمكرر ويقصّ عند الحد", () => {
    const entries = [
      { type: "text", title: "a", body: "b", id: "dup" },
      { type: "text", title: "a2", body: "b", id: "dup" },
      { type: "bogus" },
      5,
      null,
      { type: "text", title: "ok", body: "b" },
    ];
    const r = parseImport(JSON.stringify({ app: "bayda-notebook", schema: 1, entries }), NOW);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.entries.length).toBe(2);
      expect(r.skipped).toBe(4);
    }
    const many = Array.from({ length: LIMITS.entries + 100 }, (_, i) => ({ type: "text", title: "t" + i, body: "b", id: "n" + i }));
    const big = parseImport(JSON.stringify({ app: "bayda-notebook", schema: 1, entries: many }), NOW);
    expect(big.ok).toBe(true);
    if (big.ok) {
      expect(big.entries.length).toBe(LIMITS.entries);
      expect(big.skipped).toBe(100);
    }
  });

  it("الدمج: الموجود يغلب والحد محترم", () => {
    const g = gen();
    const a1 = mk({ type: "text", title: "old", body: "b" }, g);
    const other = mk({ type: "text", title: "other", body: "b" }, g);
    const r = mergeEntries([a1], [{ ...a1, title: "new" }, other]);
    expect(r.added).toBe(1);
    expect(r.dropped).toBe(1);
    expect(r.entries.map((e) => e.title)).toEqual(["old", "other"]);
    const full = Array.from({ length: LIMITS.entries }, (_, i) => ({ ...a1, id: "x" + i }));
    const r2 = mergeEntries(full, [other]);
    expect(r2.entries.length).toBe(LIMITS.entries);
    expect(r2.added).toBe(0);
    expect(r2.dropped).toBe(1);
  });
});
