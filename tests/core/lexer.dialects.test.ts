import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
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

  it("treats franco digits as letters (9oul, 3lik)", () => {
    expect(lex("9oul", new Set()).map((t) => t.type + ":" + t.value)).toEqual(["IDENT:9oul", "EOF:"]);
    expect(lex("3lik", new Set())[0]).toMatchObject({ type: "IDENT", value: "3lik" });
    expect(lex("2024", new Set())[0]).toMatchObject({ type: "NUMBER", value: "2024" });
  });
});

const packagesDir = path.resolve(__dirname, "../../packages");
const dirs = fs.readdirSync(packagesDir).filter((f) => fs.statSync(path.join(packagesDir, f)).isDirectory());

describe.each(dirs)("dialect %s keywords lexing", (dir) => {
  it("every single-word key is one IDENT", () => {
    const kw: Record<string, string> = JSON.parse(
      fs.readFileSync(path.join(packagesDir, dir, "keywords.json"), "utf8")
    );
    const bad = Object.keys(kw)
      .filter((w) => !/\s/.test(w))
      .filter((w) => {
        const t = lex(w, new Set());
        return !(t.length === 2 && t[0].type === "IDENT" && t[0].value === w);
      });
    expect({ count: bad.length, sample: bad.slice(0, 5).map(esc) }).toEqual({ count: 0, sample: [] });
  });
});
