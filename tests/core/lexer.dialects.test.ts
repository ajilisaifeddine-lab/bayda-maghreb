import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { lex } from "../../core/lexer.js";

const esc = (s: string) =>
  [...s]
    .map((c) => (c.charCodeAt(0) > 127 ? "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0") : c))
    .join("");

describe("lexer", () => {
  it("has no built-in keywords when given an empty set", () => {
    const types = lex("ila x", new Set()).map((t) => t.type);
    expect(types).toEqual(["IDENT", "IDENT", "EOF"]);
  });
});

const dir = "data/dialects/";
describe.each(fs.readdirSync(dir).filter((f) => f.endsWith(".json")))("%s", (f) => {
  it("every single-word key is one IDENT", () => {
    const kw: Record<string, string> = JSON.parse(fs.readFileSync(dir + f, "utf8")).keywords ?? {};
    const bad = Object.keys(kw)
      .filter((w) => !/\s/.test(w))
      .filter((w) => {
        const t = lex(w, new Set());
        return !(t.length === 2 && t[0].type === "IDENT" && t[0].value === w);
      });
    expect({ count: bad.length, sample: bad.slice(0, 5).map(esc) }).toEqual({ count: 0, sample: [] });
  });
});
