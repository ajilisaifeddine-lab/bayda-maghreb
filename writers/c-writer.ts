import type { Program } from "../core/ast.js";
import { compileProgram } from "./compile.js";
import { braceIfChain, braceWhile, verbatim, type TargetSyntax } from "./syntax.js";

const syntax: TargetSyntax = {
  indent: "  ",
  word: verbatim,
  argSeparator: ", ",
  terminator: ";",
  print: {
    custom: (indent, args, render) => {
      const [only] = args;
      return args.length === 1 && only.type === "String"
        ? `${indent}printf("${only.value}\\n");`
        : `${indent}printf("%s\\n", ${args.map(render).join(", ")});`;
    },
  },
  ifChain: braceIfChain("else if"),
  whileLoop: braceWhile,
  varStmt: (indent, declare, name, value, isStr) => `${indent}${declare ? (isStr ? "const char* " : "int ") : ""}${name} = ${value};`,
  forLoop: (indent, v, s, e, it, body) => s !== null && e !== null
    ? `${indent}for (int ${v} = ${s}; ${v} <= ${e}; ${v}++) {\n${body}\n${indent}}`
    : `${indent}for (int ${v} = 0; ${v} < (int)(sizeof(${it}) / sizeof(${it}[0])); ${v}++) {\n${body}\n${indent}}`,
  fnDecl: (indent, name, params, body) => `${indent}int ${name}(${params.map((p) => `int ${p}`).join(", ")}) {\n${body}\n${indent}}`,
  returnStmt: (indent, value) => `${indent}return${value !== null ? " " + value : ""};`,
  tryCatch: (indent, body, param, handler) => `${indent}/* try */ {\n${body}\n${indent}} /* catch${param ? ` (${param})` : ""} */ if (0) {\n${handler}\n${indent}}`,
  flowStmt: (indent, kind) => `${indent}${kind};`,
};
export function toC(program: Program, keywords: Record<string, string> = {}): string {
  return compileProgram(program, syntax, keywords);
}
