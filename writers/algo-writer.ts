import type { Program } from "../core/ast.js";
import { compileProgram } from "./compile.js";
import type { TargetSyntax } from "./syntax.js";

const syntax: TargetSyntax = {
  indent: "  ",
  word: (t) => (t.value === "true" ? "صحيح" : t.value === "false" ? "خطأ" : t.value),
  argSeparator: "، ",
  terminator: ";",
  print: { name: "اطبع" },
  ifChain: (indent, branches, otherwise) => {
    let code = branches
      .map((b, i) => `${indent}${i === 0 ? "إذا" : "وإلا إذا"} (${b.test}) إذن\n${b.body || indent + "  // لا شيء"}`)
      .join("\n");
    if (otherwise !== null) code += `\n${indent}وإلا\n${otherwise}`;
    return `${code}\n${indent}نهاية إذا`;
  },
  whileLoop: (indent, test, body) => `${indent}طالما (${test}) كرر\n${body}\n${indent}نهاية طالما`,
  varStmt: (indent, declare, name, value) => `${indent}${declare ? "ليكن " : ""}${name} ← ${value};`,
  forLoop: (indent, v, s, e, it, body) => {
    const b = body || indent + "  // لا شيء";
    return s !== null && e !== null
      ? `${indent}لكل ${v} من ${s} إلى ${e} كرر\n${b}\n${indent}نهاية لكل`
      : `${indent}لكل ${v} في ${it} كرر\n${b}\n${indent}نهاية لكل`;
  },
  fnDecl: (indent, name, params, body) => `${indent}دالة ${name}(${params.join("، ")})\n${body || indent + "  // لا شيء"}\n${indent}نهاية دالة`,
  returnStmt: (indent, value) => `${indent}أرجع${value !== null ? " " + value : ""};`,
  tryCatch: (indent, body, param, handler) => `${indent}حاول\n${body || indent + "  // لا شيء"}\n${indent}عند الخطأ${param ? ` (${param})` : ""}\n${handler || indent + "  // لا شيء"}\n${indent}نهاية حاول`,
  flowStmt: (indent, kind) => `${indent}${kind === "break" ? "توقف" : "واصل"};`,
};
export function toAlgo(program: Program, keywords: Record<string, string> = {}): string {
  return compileProgram(program, syntax, keywords);
}
