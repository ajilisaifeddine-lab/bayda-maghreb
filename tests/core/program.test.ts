import { describe, it, expect } from "vitest";
import { lex } from "../../core/lexer.js";
import { normalize } from "../../core/normalizer.js";
import { parseProgram } from "../../core/program.js";

const kw = { idha: "if", goul: "log" };
const ast = (src: string) => parseProgram(normalize(lex(src, new Set()), kw));

describe("parseProgram", () => {
  it("reads a call", () => {
    expect(ast('goul("a")')).toEqual({
      type: "Program",
      body: [{ type: "Call", name: "log", args: [{ type: "String", value: "a" }] }],
    });
  });
});
