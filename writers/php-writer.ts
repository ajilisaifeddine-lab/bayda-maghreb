import type { Program } from "../core/ast.js";
import { compileProgram } from "./compile.js";
import { braceIfChain, braceWhile, verbatim, type TargetSyntax } from "./syntax.js";

const syntax: TargetSyntax = {
  indent: "  ",
  word: verbatim,
  argSeparator: ", ",
  terminator: ";",
  print: { custom: (indent, args, render) => `${indent}echo ${args.map(render).join(", ")};` },
  ifChain: braceIfChain("elseif"),
  whileLoop: braceWhile,
  varStmt: (indent, _declare, name, value) => `${indent}$${name} = ${value};`,
  forLoop: (indent, v, s, e, it, body) => s !== null && e !== null
    ? `${indent}for ($${v} = ${s}; $${v} <= ${e}; $${v}++) {\n${body}\n${indent}}`
    : `${indent}foreach (${it} as $${v}) {\n${body}\n${indent}}`,
  fnDecl: (indent, name, params, body) => `${indent}function ${name}(${params.map((p) => `$${p}`).join(", ")}) {\n${body}\n${indent}}`,
  returnStmt: (indent, value) => `${indent}return${value !== null ? " " + value : ""};`,
  tryCatch: (indent, body, param, handler) => `${indent}try {\n${body}\n${indent}} catch (\\Throwable $${param ?? "e"}) {\n${handler}\n${indent}}`,
  flowStmt: (indent, kind) => `${indent}${kind};`,
};
export function toPHP(program: Program, keywords: Record<string, string> = {}): string {
  return compileProgram(program, syntax, keywords);
}
