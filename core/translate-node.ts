import { loadDialect, DialectPackage } from "./loader.js";
import { translate, Target, TranslateResult } from "./translate.js";
import { BaydaError } from "./errors.js";

export interface TranslateDialectOptions {
  /** رمز اللهجة، مثل "tn-latn". */
  dialect: string;
  /** الهدف: JavaScript أو Python. الافتراضي "js". */
  target?: Target;
  /** الموافقة على اللهجات التي تتطلبها. الافتراضي true. */
  consent?: boolean;
  /** تمرير حزمة محمّلة مسبقاً (يتجاوز loadDialect). */
  pkg?: DialectPackage;
  /** مجلد الحِزم (للاختبارات/الاستخدامات المخصّصة). */
  packagesDir?: string;
}

/**
 * غلاف Node حول translate(): يحمّل الحزمة من القرص (packages/*.json)
 * ثم يفوّض العملية الكاملة إلى translate().
 *
 *   packages/*.json → loader → ⟶ translate() ⟶ writers
 */
export function translateDialect(source: string, options: TranslateDialectOptions): TranslateResult {
  const pkg =
    options.pkg ??
    loadDialect(options.dialect, {
      consent: options.consent ?? true,
      packagesDir: options.packagesDir,
    });

  if (!pkg) {
    throw new BaydaError("UNKNOWN_DIALECT", `لهجة غير معروفة: ${options.dialect}`, {
      id: options.dialect,
    });
  }

  return translate(source, {
    keywords: pkg.keywords,
    id: pkg.id,
    target: options.target,
  });
}

/** اختصار: ترجمة مباشرة إلى JavaScript. */
export function translateToJS(source: string, dialect: string, consent = true): string {
  return translateDialect(source, { dialect, target: "js", consent }).code;
}

/** اختصار: ترجمة مباشرة إلى Python. */
export function translateToPython(source: string, dialect: string, consent = true): string {
  return translateDialect(source, { dialect, target: "py", consent }).code;
}

export default translateDialect;
