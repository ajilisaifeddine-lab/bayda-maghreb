import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const transpile = require("../bayda-transpile.cjs");
const file = path.resolve(process.cwd(), "data/dialects/libya.json");
const kw: Record<string, string> = JSON.parse(fs.readFileSync(file, "utf8")).keywords;
const word = (c: string) => Object.keys(kw).find((k) => kw[k] === c && !/\s/.test(k))!;

describe("target layer (Libyan)", () => {
  it("writes JavaScript", () => {
    const out = transpile(`${word("if")} (x) { ${word("print")}("a") }`, file);
    expect(out).toBe('if (x) { console.log("a") }');
  });

  it("writes Python", async () => {
    const { toTarget } = await import("../core/targets.js");
    const out = toTarget(`${word("if")} (x) { ${word("print")}("a") }`, file, "py");
    expect(out).toBe('if x:\n    print("a")');
  });
});

describe("target layer: core vs regex (Libyan)", () => {
  const flat = (s: string) => s.replace(/\s+/g, "")
  const p = word("print")
  const ifSrc = `${word("if")} (x) { ${p}("a") } ${word("else")} { ${p}("b") }`
  const chain = `${word("if")} (a) { ${p}("a") } ${word("else if")} (b) { ${p}("b") } ${word("else")} { ${p}("c") }`

  it("JavaScript if/else matches the regex transpiler", async () => {
    const { toTarget } = await import("../core/targets.js")
    expect(flat(toTarget(ifSrc, file, "js"))).toBe(flat(transpile(ifSrc, file)))
  })
  it("JavaScript else if matches the regex transpiler", async () => {
    const { toTarget } = await import("../core/targets.js")
    expect(flat(toTarget(chain, file, "js"))).toBe(flat(transpile(chain, file)))
  })
  it("writes Python if/else", async () => {
    const { toTarget } = await import("../core/targets.js")
    expect(toTarget(ifSrc, file, "py")).toBe('if x:\n    print("a")\nelse:\n    print("b")')
  })
  it("writes Python elif", async () => {
    const { toTarget } = await import("../core/targets.js")
    expect(toTarget(chain, file, "py")).toBe('if a:\n    print("a")\nelif b:\n    print("b")\nelse:\n    print("c")')
  })
  it("writes pass for an empty Python block", async () => {
    const { toTarget } = await import("../core/targets.js")
    expect(toTarget(`${word("if")} (x) { }`, file, "py")).toBe("if x:\n    pass")
  })
})
