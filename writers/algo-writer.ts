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
};

export function toAlgo(program: Program, keywords: Record<string, string> = {}): string {
  return compileProgram(program, syntax, keywords);
}
