import { Lexer, Token } from "./lexer.js";
import { normalize } from "./normalizer.js";
import { parseProgram, Program } from "./program.js";
import { toJS } from "../writers/js-writer.js";
import { toPython } from "../writers/python-writer.js";
import { BaydaError, MAX_SOURCE_BYTES } from "./errors.js";

export type Target = "js" | "py";

const VALID_TARGETS: readonly Target[] = ["js", "py"];

/** الحد الأدنى المطلوب لتشغيل المسار: خريطة كلمات اللهجة. */
export interface TranslateInput {
  /** كلمات اللهجة: word → concept (مثل { goul: "print", idha: "if" }). */
  keywords: Record<string, string>;
  /** معرّف اللهجة (للتوثيق فقط). */
  id?: string;
  /** الهدف: JavaScript أو Python. الافتراضي "js". */
  target?: Target;
}

export interface TranslateResult {
  /** الكود الناتج. */
  code: string;
  target: Target;
  /** معرّف اللهجة إن وُجد. */
  dialect: string | undefined;
  /** الرموز بعد التطبيع (مفاهيم قياسية). */
  tokens: Token[];
  /** شجرة البرنامج. */
  ast: Program;
  /** خريطة كلمات اللهجة المستخدمة. */
  keywords: Record<string, string>;
}

/** يتحقق من صلاحية الهدف. */
function assertTarget(target: unknown): asserts target is Target {
  if (typeof target !== "string" || !VALID_TARGETS.includes(target as Target)) {
    throw new BaydaError("INVALID_TARGET", `هدف غير مدعوم: ${String(target)}`, {
      target,
      valid: VALID_TARGETS,
    });
  }
}

/** يتحقق من صلاحية المصدر وحجمه. */
function assertSource(source: unknown): asserts source is string {
  if (typeof source !== "string") {
    throw new BaydaError("INVALID_SOURCE", "المصدر يجب أن يكون نصاً.");
  }
  if (source.length > MAX_SOURCE_BYTES) {
    throw new BaydaError(
      "SOURCE_TOO_LARGE",
      `حجم المصدر يتجاوز الحد (${MAX_SOURCE_BYTES} بايت).`,
      { length: source.length }
    );
  }
}

/**
 * ⭐ الرابط المركزي للمسار الكامل (نواة خالصة، تعمل في Node والمتصفح):
 *
 *   packages/*.json → loader → lexer → normalizer → program.ts → writers
 *
 * تستقبل خريطة الكلمات جاهزة (من loader في Node، أو من fetch في المتصفح)
 * ثم تنفّذ: lex → normalize → parseProgram → toJS/toPython.
 *
 * @example
 *   translate('goul("salam")', { keywords: { goul: "print" }, target: "js" }).code
 *   // => 'console.log("salam");'
 */
export function translate(source: string, input: TranslateInput): TranslateResult {
  assertSource(source);
  if (!input || typeof input !== "object") {
    throw new BaydaError("INVALID_SOURCE", "المدخلات مطلوبة (TranslateInput).");
  }

  const target: Target = input.target ?? "js";
  assertTarget(target);

  const keywords = input.keywords || {};

  try {
    // 1) التحليل اللغوي بكلمات اللهجة
    const tokens = new Lexer(source, keywords).tokenize();

    // 2) التطبيع إلى مفاهيم قياسية
    const normalized = normalize(tokens, keywords);

    // 3) بناء شجرة البرنامج
    const ast = parseProgram(normalized);

    // 4) الكتابة إلى الهدف
    const code = target === "py" ? toPython(ast, keywords) : toJS(ast, keywords);

    return { code, target, dialect: input.id, tokens: normalized, ast, keywords };
  } catch (e) {
    if (e instanceof BaydaError) throw e;
    // نحوّل أي خطأ تحليلي إلى PARSE_ERROR موحّد مع حفظ السبب
    throw new BaydaError("PARSE_ERROR", (e as Error).message, {
      cause: (e as Error).name,
      dialect: input.id,
    });
  }
}

export default translate;
