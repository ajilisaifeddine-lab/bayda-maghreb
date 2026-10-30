import { describe, it, expect, beforeEach } from "vitest";
import { BaydaEngine as E, containsString, MAX_SOURCE_CHARS } from "../apps/web-lab/engine";
import { examples } from "../apps/web-lab/examples";

const ids = Object.keys(examples);
const pack = (id: string, keywords: Record<string, string>) => ({
  manifest: { id, version: "1.0.0", name: "Test" },
  keywords,
  vocabulary: {},
});

beforeEach(() => {
  for (const id of ids) E.removePack(id);
  E.setDialect("");
});

describe("محرك المختبر", () => {
  it("كل لهجة: المثال المدمج يعمل بلا حزمة (js وpy)", () => {
    for (const id of ids) {
      const s = E.setDialect(id);
      expect(s.source, id).toBe("example");
      expect(Object.getPrototypeOf(s.keywords)).toBeNull();
      for (const target of ["js", "py"]) {
        const r = E.runCode(examples[id].sample, target);
        expect(r.ok, id + ":" + target + " " + (r.error || "")).toBe(true);
        expect((r.code || "").length).toBeGreaterThan(0);
      }
    }
  });

  it("لهجة غير معروفة أو اسم غير آمن: بلا مصدر ويُطلب اختيار لهجة", () => {
    for (const id of ["nope-latn", "../x", "a/b", ""]) {
      expect(E.setDialect(id).source, id).toBe("none");
      const r = E.runCode('goul("x")');
      expect(r.ok).toBe(false);
      expect(r.error).toContain("اختر لهجة");
    }
  });

  it("الكود الفارغ أو الطويل جداً يُرفض بلا خطأ", () => {
    E.setDialect("tn-latn");
    expect(E.runCode("").ok).toBe(false);
    expect(E.runCode("   ").ok).toBe(false);
    expect(E.runCode("a".repeat(MAX_SOURCE_CHARS + 1)).ok).toBe(false);
  });

  it("لا يُرمى خطأ أبداً مهما كان المدخل", () => {
    E.setDialect("tn-latn");
    for (const x of [null, 5, {}, 'constructor("x")', "__proto__", "((((", "\u0000", "a".repeat(1000)]) {
      expect(() => E.runCode(x as any, "weird" as any)).not.toThrow();
      expect(typeof E.runCode(x as any).ok).toBe("boolean");
    }
  });

  it("الحزمة المنزَّلة تحل محل المثال لتلك اللهجة فقط", () => {
    expect(E.installPack(pack("tn-latn", { zzprint: "print" })).ok).toBe(true);
    const s = E.setDialect("tn-latn");
    expect(s.source).toBe("downloaded");
    expect(Object.keys(s.keywords)).toEqual(["zzprint"]);
    expect(E.runCode('zzprint("x")').ok).toBe(true);
    expect(E.setDialect("dz-latn").source).toBe("example");
  });

  it("الحزمة غير الصالحة تُرفض ولا تُخزَّن", () => {
    const evil = JSON.parse(
      '{"manifest":{"id":"tn-latn","version":"1.0.0","name":"x"},"keywords":{"__proto__":"print"},"vocabulary":{}}'
    );
    expect(E.installPack(evil).ok).toBe(false);
    expect(E.hasPack("tn-latn")).toBe(false);
    expect(E.setDialect("tn-latn").source).toBe("example");
  });

  it("حذف الحزمة يعيد المثال المدمج", () => {
    E.installPack(pack("tn-latn", { zzprint: "print" }));
    E.setDialect("tn-latn");
    E.removePack("tn-latn");
    expect(E.getDialect().source).toBe("example");
    expect(E.hasPack("tn-latn")).toBe(false);
  });

  it("فحص الدرس: صحيح، وخاطئ، وفارغ", () => {
    E.setDialect("tn-latn");
    expect(E.checkLesson('goul("salam")').status).toBe("ok");
    expect(E.checkLesson('goul("hello")').status).toBe("wrong");
    expect(E.checkLesson("").status).toBe("error");
    expect(E.checkLesson("   ").status).toBe("error");
  });

  it("فحص الدرس: بلا لهجة أو بمدخلات غريبة لا يرمي ولا ينجح", () => {
    E.setDialect("");
    expect(E.checkLesson('goul("salam")').status).toBe("error");
    E.setDialect("tn-latn");
    for (const x of [null, 5, {}, "((((", "a".repeat(MAX_SOURCE_CHARS + 1)]) {
      expect(() => E.checkLesson(x as any)).not.toThrow();
      expect(E.checkLesson(x as any).status).not.toBe("ok");
    }
  });

  it("containsString: أشكال الشجرة وحارس العمق", () => {
    const tree = { type: "Program", body: [{ type: "Call", args: [{ type: "String", value: "salam" }] }] };
    expect(containsString(tree, "salam")).toBe(true);
    expect(containsString(tree, "other")).toBe(false);
    expect(containsString({ type: "If", test: null, then: [tree], else: null }, "salam")).toBe(true);
    expect(containsString({ type: "BinaryExpression", left: { type: "StringLiteral", value: "salam" }, right: null }, "salam")).toBe(true);
    let deep: any = { type: "String", value: "salam" };
    for (let i = 0; i < 1000; i++) deep = { type: "BinaryExpression", left: deep, right: null };
    expect(containsString(deep, "salam")).toBe(false);
    expect(containsString(null, "salam")).toBe(false);
  });
});
