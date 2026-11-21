// ما يختلف بين الأهداف فقط. المرور على الشجرة وحلّ الأسماء وتجميع الجمل في writers/compile.ts مرة واحدة.
import type { Arg } from "../core/ast.js";
import type { Token } from "../core/types.js";

/** فرع شرط: نص الشرط وجسمه المركَّب بإزاحة أعمق (فارغ إن لم تكن فيه جمل). */
export interface Branch {
  readonly test: string;
  readonly body: string;
}

export type PrintSyntax =
  /** استدعاء عادي: name(args). */
  | { readonly name: string }
  /** صياغة خاصة تعيد الجملة كاملة بإزاحتها. */
  | { readonly custom: (indent: string, args: readonly Arg[], render: (a: Arg) => string) => string };

export interface TargetSyntax {
  /** وحدة الإزاحة لكل مستوى. */
  readonly indent: string;
  /** تمثيل الرمز داخل التعبيرات (مثل true/false). */
  readonly word: (t: Token) => string;
  /** فاصل وسائط الاستدعاء ونهاية جملته. */
  readonly argSeparator: string;
  readonly terminator: string;
  readonly print: PrintSyntax;
  /** سلسلة if / else if / else: otherwise هو جسم else المركَّب أو null إن لم يوجد. */
  ifChain(indent: string, branches: readonly Branch[], otherwise: string | null): string;
  whileLoop(indent: string, test: string, body: string): string;
}

/** الرمز كما هو. */
export const verbatim = (t: Token): string => t.value;

export const callStatement = (
  indent: string,
  name: string,
  args: readonly string[],
  separator: string,
  terminator: string,
): string => `${indent}${name}(${args.join(separator)})${terminator}`;

/** if / else if / else بأقواس معقوفة (JavaScript وعائلة C وPHP). */
export const braceIfChain =
  (elseIf: string) =>
  (indent: string, branches: readonly Branch[], otherwise: string | null): string => {
    let code = branches
      .map((b, i) => `${i === 0 ? indent + "if" : " " + elseIf} (${b.test}) {\n${b.body}\n${indent}}`)
      .join("");
    if (otherwise !== null) code += ` else {\n${otherwise}\n${indent}}`;
    return code;
  };

export const braceWhile = (indent: string, test: string, body: string): string =>
  `${indent}while (${test}) {\n${body}\n${indent}}`;
