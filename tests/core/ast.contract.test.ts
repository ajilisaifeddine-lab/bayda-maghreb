// عقد الشجرة: كل عقدة ينتجها parseProgram مطابقة تماماً للأنواع المعلنة في core/ast.ts (النوع والحقول، بلا زيادة).
import { describe, it, expect } from "vitest";
import { Lexer } from "../../core/lexer";
import { normalize } from "../../core/normalizer";
import { parseProgram } from "../../core/program";

const kw = {
  goul: "print",
  idha: "if",
  "idha ken": "else if",
  sinon: "else",
  twala: "while",
  haqq: "true",
  ghalet: "false",
  khalli: "let",
  lkoll: "for",
  daalla: "function",
  rja3: "return",
  jarreb: "try",
  msak: "catch",
  hbess: "break",
  kammel: "continue",
};

const parse = (src: string): unknown => parseProgram(normalize(new Lexer(src, kw).tokenize(), kw));

const hasKeys = (n: object, keys: string[]): boolean =>
  JSON.stringify(Object.keys(n).sort()) === JSON.stringify([...keys].sort());
const isToken = (t: any): boolean =>
  !!t && typeof t.type === "string" && typeof t.value === "string" && Number.isInteger(t.line) && Number.isInteger(t.col);

function raw(n: any, at: string): string[] {
  const ok = !!n && n.type === "Raw" && hasKeys(n, ["type", "tokens"]) && Array.isArray(n.tokens) && n.tokens.length > 0 && n.tokens.every(isToken);
  return ok ? [] : [at + ": expected Raw with tokens"];
}

function arg(a: any, at: string): string[] {
  if (a && (a.type === "String" || a.type === "Number")) {
    return hasKeys(a, ["type", "value"]) && typeof a.value === "string" ? [] : [at + ": bad " + a.type];
  }
  if (a && a.type === "Raw") return raw(a, at);
  return [at + ": unknown argument type " + String(a && a.type)];
}

function block(list: any, at: string): string[] {
  return Array.isArray(list) ? list.flatMap((s: any, i: number) => stmt(s, at + "[" + i + "]")) : [at + ": expected an array"];
}

function stmt(s: any, at: string): string[] {
  switch (s && s.type) {
    case "Call":
      return [
        ...(hasKeys(s, ["type", "name", "args"]) && typeof s.name === "string" && s.name !== "" ? [] : [at + ": bad Call"]),
        ...(Array.isArray(s.args) ? s.args.flatMap((a: any, i: number) => arg(a, at + ".args[" + i + "]")) : [at + ": args"]),
      ];
    case "If":
      return [
        ...(hasKeys(s, ["type", "test", "then", "else"]) ? [] : [at + ": bad If keys"]),
        ...raw(s.test, at + ".test"),
        ...block(s.then, at + ".then"),
        ...(s.else === null ? [] : block(s.else, at + ".else")),
      ];
    case "While":
      return [
        ...(hasKeys(s, ["type", "test", "body"]) ? [] : [at + ": bad While keys"]),
        ...raw(s.test, at + ".test"),
        ...block(s.body, at + ".body"),
      ];
    case "Var":
      return [
        ...(hasKeys(s, ["type", "declare", "name", "value"]) && typeof s.declare === "boolean" && typeof s.name === "string" && s.name !== "" ? [] : [at + ": bad Var keys"]),
        ...raw(s.value, at + ".value"),
      ];
    case "For":
      return [
        ...(hasKeys(s, ["type", "variable", "start", "end", "iterable", "body"]) && typeof s.variable === "string" && s.variable !== "" ? [] : [at + ": bad For keys"]),
        ...(s.start === null ? [] : raw(s.start, at + ".start")),
        ...(s.end === null ? [] : raw(s.end, at + ".end")),
        ...(s.iterable === null ? [] : raw(s.iterable, at + ".iterable")),
        ...block(s.body, at + ".body"),
      ];
    case "Fn":
      return [
        ...(hasKeys(s, ["type", "name", "params", "body"]) && typeof s.name === "string" && s.name !== "" && Array.isArray(s.params) && s.params.every((p: any) => typeof p === "string" && p !== "") ? [] : [at + ": bad Fn keys"]),
        ...block(s.body, at + ".body"),
      ];
    case "Return":
      return [
        ...(hasKeys(s, ["type", "value"]) ? [] : [at + ": bad Return keys"]),
        ...(s.value === null ? [] : raw(s.value, at + ".value")),
      ];
    case "Try":
      return [
        ...(hasKeys(s, ["type", "body", "param", "handler"]) && (s.param === null || (typeof s.param === "string" && s.param !== "")) ? [] : [at + ": bad Try keys"]),
        ...block(s.body, at + ".body"),
        ...block(s.handler, at + ".handler"),
      ];
    case "Flow":
      return hasKeys(s, ["type", "kind"]) && (s.kind === "break" || s.kind === "continue") ? [] : [at + ": bad Flow keys"];
    default:
      return [at + ": unknown statement type " + String(s && s.type)];
  }
}

const problems = (p: any): string[] =>
  p && p.type === "Program" && hasKeys(p, ["type", "body"]) ? block(p.body, "body") : ["root: expected a Program"];

const corpus: Array<[string, string]> = [
  ["call with a string", 'goul("a")'],
  ["call with string, number and keyword", 'goul("a", 2, haqq)'],
  ["call with expressions", 'goul("a" + x, f(1, 2))'],
  ["empty call", "goul()"],
  ["unknown function", "foo(1)"],
  ["statements separated by ; and newlines", 'goul("a");\ngoul("b")'],
  ["if", 'idha haqq { goul("a") }'],
  ["if with a comparison and else", 'idha (x == 2) { goul("a") } sinon { goul("b") }'],
  ["else if chain", 'idha a { goul("a") } idha ken b { goul("b") } sinon { goul("c") }'],
  ["while", 'twala (ghalet) { goul("a") }'],
  ["if inside if", 'idha haqq { idha ghalet { goul("a") } sinon { goul("b") } }'],
  ["if inside while", 'twala (x < 3) { idha haqq { goul("a") } }'],
  ["while inside if", 'idha haqq { twala (ghalet) { goul("a") } }'],
  ["let declaration and reassignment", "khalli x = 10\nx = x + 1"],
  ["for range", "lkoll (k : 1..3) { goul(k) }"],
  ["for iterable", "lkoll (city : cities) { goul(city) }"],
  ["function and return", "daalla add(a, b) { rja3 a + b }"],
  ["empty return", "daalla ping() { rja3 }"],
  ["try catch with param", "jarreb { goul(\"ok\") } msak (err) { goul(\"err\") }"],
  ["try catch without param", "jarreb { goul(\"ok\") } msak { goul(\"err\") }"],
  ["break and continue", "twala (haqq) { hbess\nkammel }"],
];

describe("عقد الشجرة (core/ast.ts)", () => {
  it.each(corpus)("%s", (_name, src) => {
    expect(problems(parse(src))).toEqual([]);
  });

  it("while ينتج عقدة While بكتلة body", () => {
    const [n]: any = (parse('twala (ghalet) { goul("a") }') as any).body;
    expect(n.type).toBe("While");
    expect(n.body).toHaveLength(1);
  });

  it("المدقّق نفسه يرفض العقد الخارجة عن العقد", () => {
    const call = (args: unknown[]) => ({ type: "Program", body: [{ type: "Call", name: "x", args }] });
    expect(problems({ type: "Program", body: [{ type: "Foo" }] })).not.toEqual([]);
    expect(problems(call([{ type: "Ident", value: "v" }]))).not.toEqual([]);
    expect(problems(call([{ type: "String", value: "a", extra: 1 }]))).not.toEqual([]);
    expect(problems({ type: "Program", body: [{ type: "While", test: { type: "Raw", tokens: [] }, body: [] }] })).not.toEqual([]);
    expect(problems(null)).not.toEqual([]);
  });
});
