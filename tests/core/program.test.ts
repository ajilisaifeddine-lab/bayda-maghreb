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

describe("parseProgram if", () => {
  const kw2 = { idha: "if", "idha ken": "else if", sinon: "else", goul: "log" }
  const parse2 = (src: string) => parseProgram(normalize(lex(src, new Set()), kw2))
  const cond = (n: any) => n.test.tokens.map((t: any) => t.value).join("")
  const log = (v: string) => ({ type: "Call", name: "log", args: [{ type: "String", value: v }] })

  it("reads a simple if", () => {
    const [n]: any = parse2('idha x == 2 { goul("a") }').body
    expect(n.type).toBe("If")
    expect(cond(n)).toBe("x==2")
    expect(n.then).toEqual([log("a")])
    expect(n.else).toBeNull()
  })
  it("removes parentheses around the whole condition", () => {
    const [n]: any = parse2('idha (x == 2) { goul("a") }').body
    expect(cond(n)).toBe("x==2")
  })
  it("reads else", () => {
    const [n]: any = parse2('idha x { goul("a") } sinon { goul("b") }').body
    expect(n.else).toEqual([log("b")])
  })
  it("reads else if as a nested if", () => {
    const [n]: any = parse2('idha a { goul("a") } idha ken b { goul("b") } sinon { goul("c") }').body
    expect(n.else).toHaveLength(1)
    expect(n.else[0].type).toBe("If")
    expect(cond(n.else[0])).toBe("b")
    expect(n.else[0].else).toEqual([log("c")])
  })
})
