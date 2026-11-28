// عقد شجرة البرنامج: النموذج الوحيد المعتمد بين المحلل (program.ts) والكتّاب (writers/*).
// أي عقدة جديدة تُعرَّف هنا أولاً ثم يُعدَّل المحلل والكتّاب.
import type { Token } from "./types.js";

/** وسيط استدعاء: نص أو عدد، وإلا رموز خام (تعبير) بعد التطبيع. */
export type Arg = { type: "String" | "Number"; value: string } | { type: "Raw"; tokens: Token[] };
/** شرط أو تعبير: رموز خام بعد التطبيع (بلا الأقواس المحيطة بالشرط كله). */
export type Expr = { type: "Raw"; tokens: Token[] };

export type Call = { type: "Call"; name: string; args: Arg[] };
/** else فارغ (null) أو كتلة؛ و else if يُمثَّل If وحيداً داخل else. */
export type If = { type: "If"; test: Expr; then: Stmt[]; else: Stmt[] | null };
export type While = { type: "While"; test: Expr; body: Stmt[] };
export type Var = { type: "Var"; declare: boolean; name: string; value: Expr };
export type For = { type: "For"; variable: string; start: Expr | null; end: Expr | null; iterable: Expr | null; body: Stmt[] };
export type Fn = { type: "Fn"; name: string; params: string[]; body: Stmt[] };
export type Return = { type: "Return"; value: Expr | null };
export type Try = { type: "Try"; body: Stmt[]; param: string | null; handler: Stmt[] };
export type Flow = { type: "Flow"; kind: "break" | "continue" };
export type Stmt = Call | If | While | Var | For | Fn | Return | Try | Flow;

export type Program = { type: "Program"; body: Stmt[] };
