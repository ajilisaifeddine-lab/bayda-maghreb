import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { transpile, dialects } from "../index.js";

const CORE = new Set("if else while do var this for break continue function return true false null let const switch import export class new try catch finally throw await async".split(" "));
const NO_IF_ELSE = new Set(["mauritania"]);

describe.each(dialects as any[])("dialect $code", (d: any) => {
  const j = JSON.parse(fs.readFileSync("data/dialects/" + d.file, "utf8"));
  const kw: Record<string, string> = j.keywords ?? j;
  const find = (...vals: string[]) => {
    for (const v of vals) {
      const w = Object.keys(kw).find((x) => kw[x] === v);
      if (w) return w;
    }
  };

  it("translates every keyword that maps to a JS core word", () => {
    const bad = Object.keys(kw).filter(
      (k) => k.length > 1 && CORE.has(kw[k]) && transpile(k, d.code) !== kw[k]
    );
    expect(bad).toEqual([]);
  });

  it("translates an if/else sentence", () => {
    const [i, t, p, e] = [find("if"), find("true"), find("print", "console.log", "log"), find("else")];
    if (!(i && t && p && e)) {
      expect(NO_IF_ELSE.has(d.code)).toBe(true);
      return;
    }
    const src = `${i} (${t}) { ${p}("zz") } ${e} { ${p}("yy") }`;
    expect(transpile(src, d.code)).toBe('if (true) { console.log("zz") } else { console.log("yy") }');
  });
});
