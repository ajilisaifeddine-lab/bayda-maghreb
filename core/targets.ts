import { Lexer } from "./lexer.js";
import { normalize } from "./normalizer.js";
import { parseProgram } from "./program.js";
import { toJS } from "../writers/js-writer.js";
import { toPython } from "../writers/python-writer.js";
import { toC } from "../writers/c-writer.js";
import { toCpp } from "../writers/cpp-writer.js";
import { toJava } from "../writers/java-writer.js";
import { toPHP } from "../writers/php-writer.js";
import { toAlgo } from "../writers/algo-writer.js";

export type Target = "js" | "py" | "c" | "cpp" | "java" | "php" | "algo";

/**
 * كلمات قياسية افتراضية لدعم التوافقية العكسية مع المصرّف القديم.
 * في الاستخدام الحديث، تُمرر اللهجة الحقيقية إلى translate() عبر loader.
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
 * المصرّف الأساسي السريع: lexer → normalizer → program → writer.
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
  switch (target) {
    case "py":
      return toPython(ast, map);
    case "c":
      return toC(ast, map);
    case "cpp":
      return toCpp(ast, map);
    case "java":
      return toJava(ast, map);
    case "php":
      return toPHP(ast, map);
    case "algo":
      return toAlgo(ast, map);
    case "js":
    default:
      return toJS(ast, map);
  }
}

export function toTarget(src: string, file: string, target: Target): string {
  return transpileToTarget(src, file, target);
}

export default { toTarget, transpileToTarget };
