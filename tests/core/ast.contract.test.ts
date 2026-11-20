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
