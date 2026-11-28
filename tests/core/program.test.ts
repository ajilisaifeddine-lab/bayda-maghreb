import { describe, it, expect } from "vitest";
import { lex } from "../../core/lexer";
import { normalize } from "../../core/normalizer";
import { parseProgram } from "../../core/program";

describe("parseProgram", () => {
  const kw2 = { idha: "if", "idha ken": "else if", sinon: "else", goul: "log" };
  const parse2 = (src: string) => parseProgram(normalize(lex(src, new Set()), kw2 as any));
  const cond = (n: any) => n.test.tokens.map((t: any) => t.value).join(" ");
  const log = (v: string) => ({ type: "Call", name: "log", args: [{ type: "String", value: v }] });

  it("reads a simple if", () => {
    const [n]: any = parse2('idha x == 2 { goul("a") }').body;
    expect(n.type).toBe("If");
    expect(cond(n).replace(/\s+/g, '')).toBe("x==2");
    expect(n.then).toEqual([log("a")]);
    expect(n.else).toBeNull();
  });

  it("removes parentheses around the whole condition", () => {
    const [n]: any = parse2('idha (x == 2) { goul("a") }').body;   
    expect(cond(n).replace(/\s+/g, '')).toBe("x==2");
  });

  it("reads else", () => {
    const [n]: any = parse2('idha x { goul("a") } sinon { goul("b") }').body;
    expect(n.else).toEqual([log("b")]);
  });

  it("reads else if as a nested if", () => {
    const [n]: any = parse2('idha a { goul("a") } idha ken b { goul("b") } sinon { goul("c") }').body;
    expect(n.else).toHaveLength(1);
    expect(n.else[0].type).toBe("If");
    expect(cond(n.else[0])).toBe("b");
    expect(n.else[0].else).toEqual([log("c")]);
  });
});

describe("parseProgram call arguments", () => {
  const kw3 = { goul: "log", haqq: "true", khalli: "let", lkoll: "for", daalla: "function", rja3: "return", jarreb: "try", msak: "catch", hbess: "break", kammel: "continue" };
  const parse3 = (src: string) => parseProgram(normalize(lex(src, new Set()), kw3 as any));
  const call = (src: string): any => parse3(src).body[0];
  const text = (a: any) => a.tokens.map((t: any) => t.value).join("");

  it("keeps simple arguments as before", () => {
    const a = call('goul("a", 2, H)').args;
    expect(a).toHaveLength(3);
    expect(a[0].type).toBe("String");
    expect(a[1].type).toBe("Number");
    expect(a[2].type).toBe("Raw");
  });

  it("reads an expression as a raw argument", () => {
    const a = call('goul("a" + H, 2)').args;
    expect(a).toHaveLength(2);
    expect(a[0].type).toBe("Raw");
    expect(text(a[0])).toContain('H');
    expect(a[1]).toEqual({ type: "Number", value: "2" });
  });

  it("does not split on commas inside parentheses", () => {
    const a = call("goul(f(1, 2), 3)").args;
    expect(a).toHaveLength(2);
    expect(text(a[0])).toBe("f(1,2)");
  });

  it("reads a keyword argument as raw", () => {
    const a = call("goul(haqq)").args;
    expect(a[0].type).toBe("Raw");
    expect(text(a[0])).toBe("true");
  });

  it("throws on an unclosed call", () => {
    expect(() => parse3('goul("a"')).toThrow();
  });

  it("reads an empty call", () => {
    expect(call("goul()").args).toEqual([]);
  });
  it("parses let, reassignment, and for loops", () => {
    const p = parse3("khalli n = 1\nn = n + 1\nlkoll (k : 1..3) { goul(k) }");
    expect(p.body[0]).toMatchObject({ type: "Var", declare: true, name: "n" });
    expect(p.body[1]).toMatchObject({ type: "Var", declare: false, name: "n" });
    expect(p.body[2]).toMatchObject({ type: "For", variable: "k", iterable: null });
    const itFor = parse3("lkoll (c : list) { goul(c) }").body[0] as any;
    expect(itFor.type).toBe("For");
    expect(itFor.start).toBeNull();
    expect(itFor.iterable.tokens[0].value).toBe("list");
  });

  it("parses function, return, try/catch, break, and continue", () => {
    const p = parse3("daalla add(a, b) { rja3 a + b }\njarreb { hbess } msak (err) { kammel }");
    expect(p.body[0]).toMatchObject({ type: "Fn", name: "add", params: ["a", "b"] });
    expect((p.body[0] as any).body[0].type).toBe("Return");
    expect(p.body[1]).toMatchObject({ type: "Try", param: "err" });
    expect((p.body[1] as any).body[0]).toEqual({ type: "Flow", kind: "break" });
    expect((p.body[1] as any).handler[0]).toEqual({ type: "Flow", kind: "continue" });
    const emptyRet = parse3("daalla ping() { rja3 }").body[0] as any;
    expect(emptyRet.body[0]).toEqual({ type: "Return", value: null });
  });
});
