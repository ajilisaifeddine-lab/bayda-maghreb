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
};

export function toCpp(program: Program, keywords: Record<string, string> = {}): string {
  return compileProgram(program, syntax, keywords);
}
