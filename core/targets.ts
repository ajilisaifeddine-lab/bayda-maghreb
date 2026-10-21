import { Lexer } from "./lexer.js";
import { normalize } from "./normalizer.js";
import { parseProgram } from "./program.js";
import { toJS } from "../writers/js-writer.js";
import { toPython } from "../writers/python-writer.js";

export type Target = "js" | "py";

/**
 * خريطة افتراضية صغيرة للتوافق مع الاستدعاءات القديمة التي لا تحدّد لهجة.
 * عند استخدام translate() تُمرَّر خريطة اللهجة الحقيقية من الحزمة.
 */
const DEFAULT_KEYWORDS: Record<string, string> = {
  // طباعة
  ktab: "print", kteb: "print", goul: "print", ekteb: "print", ektb: "print", aru: "print", skr: "print",
  // شرط
  idha: "if", ida: "if", kan: "if", ila: "if", ma: "if",
  // وإلا
  wella: "else", wla: "else", wela: "else", sinon: "else", maulac: "else",
  // صح
  haqq: "true", sah: "true", sahih: "true", tidett: "true", tidtt: "true", s7i7: "true", shih: "true",
  // خطأ
  bla: "false", ghalt: "false", ghalet: "false", mgaz: "false", amgaz: "false",
  // حلقة
  while: "while", twala: "while", hata: "while",
};

/**
 * ترجمة نصّية عبر المسار الكامل: lexer → normalizer → program → writer.
 * (بديل عن الاستبدال بالـ regex الصلب.)
 */
export function transpileToTarget(
  src: string,
  _file: string,
  target: Target,
  keywords: Record<string, string> = {}
): string {
  const map = { ...DEFAULT_KEYWORDS, ...keywords };
  const tokens = new Lexer(src, map).tokenize();
  const normalized = normalize(tokens, map);
  const ast = parseProgram(normalized);
  return target === "py" ? toPython(ast, map) : toJS(ast, map);
}

export function toTarget(src: string, file: string, target: Target): string {
  return transpileToTarget(src, file, target);
}

export default { toTarget, transpileToTarget };
