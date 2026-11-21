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
};

export function toPHP(program: Program, keywords: Record<string, string> = {}): string {
  return compileProgram(program, syntax, keywords);
}
