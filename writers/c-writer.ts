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
};

export function toC(program: Program, keywords: Record<string, string> = {}): string {
  return compileProgram(program, syntax, keywords);
}
