/**
 * نظام أخطاء موحّد لنواة Bayda Maghreb.
 *
 * كل خطأ يحمل كوداً ثابتاً (code) يسهّل التعامل البرمجي معه في المستهلكين
 * (المختبر / CLI / المكتبة) دون الاعتماد على نص الرسالة.
 */

export type BaydaErrorCode =
  | "INVALID_DIALECT_NAME"
  | "UNKNOWN_DIALECT"
  | "CONSENT_REQUIRED"
  | "PATH_ESCAPE"
  | "INVALID_TARGET"
  | "INVALID_SOURCE"
  | "SOURCE_TOO_LARGE"
  | "PARSE_ERROR"
  | "SCHEMA_ERROR";

/** الحد الأقصى لحجم المصدر (بالبايت) لمنع الاستهلاك المفرط. */
export const MAX_SOURCE_BYTES = 1_000_000; // ~1MB

export class BaydaError extends Error {
  readonly code: BaydaErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(code: BaydaErrorCode, message: string, details?: Record<string, unknown>) {
    // نُدمج الكود داخل الرسالة: مقروء للبشر (عربي) + قابل للبحث آلياً (code).
    // مثال: "[CONSENT_REQUIRED] اللهجة تتطلب موافقة."
    super(`[${code}] ${message}`);
    this.name = "BaydaError";
    this.code = code;
    this.details = details;
    // يحافظ على سلسلة prototype عند الترجمة إلى ES5
    Object.setPrototypeOf(this, BaydaError.prototype);
  }
}

export function isBaydaError(e: unknown): e is BaydaError {
  return e instanceof BaydaError;
}
