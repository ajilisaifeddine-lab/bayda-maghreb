import { describe, it, expect } from "vitest";
import { lex } from "../../core/lexer";
import { normalize } from "../../core/normalizer";
import { parseProgram } from "../../core/program";

describe("parseProgram", () => {
  const parse = (src: string) => {
    const tokens = lex(src);
    const norm = normalize(tokens, new Set(["idha", "ken", "else if", "sinon", "wella", "goul", "ktab"]));
    return parseProgram(norm);
  };

  it("reads a call", () => {
    expect(parse('goul("a")')).toEqual({
      type: "Program",
      body: [{ type: "Call", name: "goul", args: [{ type: "String", value: "a" }] }],
    });
  });

  it("reads a simple if", () => {
    const n = parse("idha x == 2 { goul(\"a\") }").body[0];
    expect(n.type).toBe("If");
    expect(n.test.tokens.map((t: any) => t.value).join(" ")).toBe("x == 2");
  });

  it("removes parentheses around the whole condition", () => {
    const n = parse("idha (x == 2) { goul(\"a\") }").body[0];
    expect(n.type).toBe("If");
    expect(n.test.tokens.map((t: any) => t.value).join(" ")).toBe("x == 2");
  });

  it("reads else", () => {
    const n = parse("idha x { goul(\"a\") } sinon { goul(\"b\") }").body[0];
    expect(n.type).toBe("If");
    expect(n.else).toBeDefined();
  });

  it("reads else if as a nested if", () => {
    const n = parse("idha a { goul(\"a\") } idha ken b { goul(\"b\") }").body[0];
    expect(n.type).toBe("If");
    // التحقق من أن else موجود
    expect(n.else).toBeDefined();
  });
});
