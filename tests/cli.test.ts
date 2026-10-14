import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const cli = path.resolve(process.cwd(), "bayda-bin");
const run = (...args: string[]) =>
  spawnSync("node", [cli, ...args], { encoding: "utf8" });

describe("cli", () => {
  it("has no duplicate shebang", () => {
    for (const f of ["bayda-transpile.cjs"]) {
      const lines = fs.readFileSync(path.resolve(process.cwd(), f), "utf8").split("\n");
      expect(lines[1].startsWith("#!")).toBe(false);
    }
  });

  it("bayda-bin has exactly one shebang", () => {
    const lines = fs.readFileSync(cli, "utf8").split("\n")
    expect(lines[0].startsWith("#!")).toBe(true)
    expect(lines.filter(l => l.startsWith("#!")).length).toBe(1)
  })

  it("prints usage without args", () => {
    const r = run();
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("usage: bayda");
  });

  it("transpiles a file", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bayda-"));
    const f = path.join(dir, "s.txt");
    fs.writeFileSync(f, 'ila (s7i7) { warri("ila") } illa { warri("no") }');
    const r = run(f, "--dialect", "tn-latn", "--js");
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toBe('if (true) { console.log("ila") } else { console.log("no") }');
  });
});
