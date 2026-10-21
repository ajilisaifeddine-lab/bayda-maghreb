import { describe, it, expect } from "vitest";
import { loadDialect, assertSafeDialectName } from "../../core/loader";
import { isBaydaError, BaydaError } from "../../core/errors";

/** يعيد كود الخطأ المُرمى من دالة. */
function codeOf(fn: () => unknown): string {
  try {
    fn();
  } catch (e) {
    if (isBaydaError(e)) return (e as BaydaError).code;
    throw e;
  }
  throw new Error("لم يُرمَ أي خطأ");
}

describe("loader — تحصين الأمان (path traversal)", () => {
  it("يرفض اسم لهجة يحتوي مسار صعود (..)", () => {
    expect(codeOf(() => loadDialect("../../etc", { consent: true }))).toBe("INVALID_DIALECT_NAME");
  });

  it("يرفض الفصل بشرطة مائلة", () => {
    expect(codeOf(() => loadDialect("tn/../dz", { consent: true }))).toBe("INVALID_DIALECT_NAME");
    expect(codeOf(() => loadDialect("tn-latn/x", { consent: true }))).toBe("INVALID_DIALECT_NAME");
  });

  it("يرفض الشرطة المائلة العكسية ومحارف الفصل", () => {
    expect(codeOf(() => loadDialect("..\\windows", { consent: true }))).toBe(
      "INVALID_DIALECT_NAME"
    );
  });

  it("يرفض الاسم الفارغ أو غير النصي", () => {
    expect(codeOf(() => assertSafeDialectName(""))).toBe("INVALID_DIALECT_NAME");
    expect(codeOf(() => assertSafeDialectName("."))).toBe("INVALID_DIALECT_NAME");
    expect(codeOf(() => assertSafeDialectName("-bad"))).toBe("INVALID_DIALECT_NAME");
    // @ts-expect-error اختبار مدخل غير نصي
    expect(codeOf(() => assertSafeDialectName(123))).toBe("INVALID_DIALECT_NAME");
  });

  it("يقبل الأسماء الصحيحة (حروف/أرقام/شرطة)", () => {
    expect(() => assertSafeDialectName("tn-latn")).not.toThrow();
    expect(() => assertSafeDialectName("kab-tifinagh")).not.toThrow();
    expect(() => assertSafeDialectName("dz2")).not.toThrow();
  });

  it("يحمّل لهجة صحيحة فعلياً", () => {
    const pkg = loadDialect("tn-latn", { consent: true });
    expect(pkg).not.toBeNull();
    expect(pkg!.id).toBe("tn-latn");
  });

  it("لا تُسرّب reviewStatus إلى الكلمات بعد التحميل", () => {
    const pkg = loadDialect("tn-latn", { consent: true })!;
    expect(Object.keys(pkg.keywords)).not.toContain("reviewStatus");
  });
});
