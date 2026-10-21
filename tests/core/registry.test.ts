import { describe, it, expect } from "vitest";
import { listDialects, getDialectInfo, getKeywords } from "../../core/registry";
import { BaydaError, isBaydaError, MAX_SOURCE_BYTES } from "../../core/errors";
import { translate } from "../../core/translate";

describe("registry — مصدر الحقيقة الواحد", () => {
  it("يسرد كل اللهجات السبع", () => {
    const dialects = listDialects();
    const ids = dialects.map((d) => d.id);
    expect(ids).toContain("tn-latn");
    expect(ids).toContain("dz-latn");
    expect(ids).toContain("kab-latn");
    expect(ids).toContain("kab-tifinagh");
    expect(ids).toContain("ly-latn");
    expect(ids).toContain("mr-latn");
    expect(ids).toContain("shi-latn");
    expect(dialects.length).toBeGreaterThanOrEqual(7);
  });

  it("كل لهجة تحمل بيانات وصفية صحيحة", () => {
    for (const d of listDialects()) {
      expect(d.id).toBeTruthy();
      expect(d.name).toBeTruthy();
      expect(typeof d.keywordCount).toBe("number");
      expect(d.keywordCount).toBeGreaterThan(0);
    }
  });

  it("يعيد معلومات لهجة واحدة مع حِزمتها", () => {
    const pkg = getDialectInfo("tn-latn");
    expect(pkg.id).toBe("tn-latn");
    expect(Object.keys(pkg.keywords).length).toBeGreaterThan(0);
  });

  it("getKeywords اختصار صحيح", () => {
    const kw = getKeywords("tn-latn");
    expect(Object.keys(kw).length).toBeGreaterThan(0);
  });

  it("يرمي UNKNOWN_DIALECT لمعرّف غير موجود", () => {
    try {
      getDialectInfo("xx-nonexistent");
      throw new Error("كان يجب أن يرمي");
    } catch (e) {
      expect(isBaydaError(e)).toBe(true);
      expect((e as BaydaError).code).toBe("UNKNOWN_DIALECT");
    }
  });
});

describe("translate — تحصين المدخلات", () => {
  it("يرفض مصدراً غير نصي", () => {
    // @ts-expect-error اختبار مدخل خاطئ
    expect(() => translate(123, { keywords: {} })).toThrow(/INVALID_SOURCE/);
  });

  it("يرفض هدفاً غير مدعوم", () => {
    expect(() =>
      // @ts-expect-error هدف خاطئ
      translate("goul(1)", { keywords: { goul: "print" }, target: "java" })
    ).toThrow(/INVALID_TARGET/);
  });

  it("يرفض مصدراً يتجاوز الحد", () => {
    const huge = "a".repeat(MAX_SOURCE_BYTES + 1);
    expect(() => translate(huge, { keywords: {} })).toThrow(/SOURCE_TOO_LARGE/);
  });

  it("يحوّل أخطاء التحليل إلى PARSE_ERROR موحّد", () => {
    try {
      translate("idha (", { keywords: { idha: "if" } });
      throw new Error("كان يجب أن يرمي");
    } catch (e) {
      expect(isBaydaError(e)).toBe(true);
      expect((e as BaydaError).code).toBe("PARSE_ERROR");
    }
  });

  it("يعمل بشكل صحيح مع مدخل سليم", () => {
    const r = translate('goul("salam")', { keywords: { goul: "print" } });
    expect(r.code).toContain("console.log");
  });
});
