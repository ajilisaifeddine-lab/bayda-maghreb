/**
 * Bayda Maghreb — نقطة الدخول للمكتبة.
 *
 * المسار الموحّد:
 *   packages/*.json → loader → lexer → normalizer → program.ts → writers
 *   وكلّه عبر translate().
 */

// الرابط المركزي (نقي، يعمل في Node والمتصفح)
export { translate } from "./core/translate.js";
export type { TranslateInput, TranslateResult, Target } from "./core/translate.js";

// غلاف Node (يقرأ الحِزَم من القرص)
export { translateDialect, translateToJS, translateToPython } from "./core/translate-node.js";
export type { TranslateDialectOptions } from "./core/translate-node.js";

// التحميل والسجل (مصدر الحقيقة الواحد للمستهلكين)
export { loadDialect, assertSafeDialectName } from "./core/loader.js";
export type { DialectPackage } from "./core/loader.js";
export { listDialects, getDialectInfo, getKeywords } from "./core/registry.js";
export type { DialectInfo, RegistryOptions } from "./core/registry.js";

// الأخطاء الموحّدة
export { BaydaError, isBaydaError, MAX_SOURCE_BYTES } from "./core/errors.js";
export type { BaydaErrorCode } from "./core/errors.js";

// مكوّنات المسار (للاستخدام المتقدّم)
export { Lexer, lex } from "./core/lexer.js";
export type { Token } from "./core/lexer.js";
export { normalize } from "./core/normalizer.js";
export { parseProgram } from "./core/program.js";
export { toJS } from "./writers/js-writer.js";
export { toPython } from "./writers/python-writer.js";
export { detectScript, detectDialectHint, isFranco } from "./core/detector.js";
export { toTarget, transpileToTarget } from "./core/targets.js";

import { loadDialect } from "./core/loader.js";
import { translate } from "./core/translate.js";
import { translateDialect } from "./core/translate-node.js";
import { listDialects, getDialectInfo } from "./core/registry.js";
import { BaydaError } from "./core/errors.js";

/** يحمّل لهجة ويعيد الحزمة كاملة (يرمي UNKNOWN_DIALECT إن لم توجد). */
export function getDialect(code: string, consent = true) {
  const pkg = loadDialect(code, { consent });
  if (!pkg) throw new BaydaError("UNKNOWN_DIALECT", `لهجة غير معروفة: ${code}`, { id: code });
  return pkg;
}

/** توافقية: تحميل من مدخل فيه id. */
export function load(entry: { id: string }) {
  return getDialect(entry.id);
}

export default {
  translate,
  translateDialect,
  loadDialect,
  listDialects,
  getDialectInfo,
  getDialect,
  load,
};
