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
  varStmt: (indent, _declare, name, value) => `${indent}${name} = ${value}`,
  forLoop: (indent, v, s, e, it, body) => {
    const b = body || indent + UNIT + "pass";
    return s !== null && e !== null
      ? `${indent}for ${v} in range(${s}, (${e}) + 1):\n${b}`
      : `${indent}for ${v} in ${it}:\n${b}`;
  },
  fnDecl: (indent, name, params, body) => `${indent}def ${name}(${params.join(", ")}):\n${body || indent + UNIT + "pass"}`,
  returnStmt: (indent, value) => `${indent}return${value !== null ? " " + value : ""}`,
  tryCatch: (indent, body, param, handler) => `${indent}try:\n${body || indent + UNIT + "pass"}\n${indent}except Exception${param ? ` as ${param}` : ""}:\n${handler || indent + UNIT + "pass"}`,
  flowStmt: (indent, kind) => `${indent}${kind}`,
};
export function toPython(program: Program, keywords: Record<string, string> = {}): string {
  return compileProgram(program, syntax, keywords);
}
