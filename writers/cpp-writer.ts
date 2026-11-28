import type { Program } from "../core/ast.js";
import { compileProgram } from "./compile.js";
import { braceIfChain, braceWhile, verbatim, type TargetSyntax } from "./syntax.js";

const syntax: TargetSyntax = {
  indent: "  ",
  word: verbatim,
  argSeparator: ", ",
  terminator: ";",
  print: { custom: (indent, args, render) => `${indent}std::cout << ${args.map(render).join(' << " " << ')} << std::endl;` },
  ifChain: braceIfChain("else if"),
  whileLoop: braceWhile,
  varStmt: (indent, declare, name, value) => `${indent}${declare ? "auto " : ""}${name} = ${value};`,
  forLoop: (indent, v, s, e, it, body) => s !== null && e !== null
    ? `${indent}for (int ${v} = ${s}; ${v} <= ${e}; ${v}++) {\n${body}\n${indent}}`
    : `${indent}for (const auto& ${v} : ${it}) {\n${body}\n${indent}}`,
  fnDecl: (indent, name, params, body) => `${indent}auto ${name}(${params.map((p) => `auto ${p}`).join(", ")}) {\n${body}\n${indent}}`,
  returnStmt: (indent, value) => `${indent}return${value !== null ? " " + value : ""};`,
  tryCatch: (indent, body, param, handler) => `${indent}try {\n${body}\n${indent}} catch (${param ? `const std::exception& ${param}` : "..."}) {\n${handler}\n${indent}}`,
  flowStmt: (indent, kind) => `${indent}${kind};`,
};
export function toCpp(program: Program, keywords: Record<string, string> = {}): string {
  return compileProgram(program, syntax, keywords);
}
