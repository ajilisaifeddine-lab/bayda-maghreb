import type { Program } from "../core/ast.js";
import { compileProgram } from "./compile.js";
import type { TargetSyntax } from "./syntax.js";

const UNIT = "    ";

const syntax: TargetSyntax = {
  indent: UNIT,
  word: (t) => (t.value === "true" ? "True" : t.value === "false" ? "False" : t.value),
  argSeparator: ", ",
  terminator: "",
  print: { name: "print" },
  ifChain: (indent, branches, otherwise) => {
    let code = branches
      .map((b, i) => `${indent}${i === 0 ? "if" : "elif"} ${b.test}:\n${b.body || indent + UNIT + "pass"}`)
      .join("\n");
    if (otherwise !== null) code += `\n${indent}else:\n${otherwise}`;
    return code;
  },
  whileLoop: (indent, test, body) => `${indent}while ${test}:\n${body}`,
};

export function toPython(program: Program, keywords: Record<string, string> = {}): string {
  return compileProgram(program, syntax, keywords);
}
