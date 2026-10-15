import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const bin = path.resolve(process.cwd(), "bayda-bin");
const repl = path.resolve(process.cwd(), "bayda-repl.cjs");
const code = 'ken (s7i7) { goul("ila") } wella { goul("no") }';

describe("runs from another directory", () => {
  it("bayda runs a file", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bayda-"));
    const f = path.join(dir, "s.tn-latn.bayda");
    fs.writeFileSync(f, code);
    const r = spawnSync("node", [bin, f], { cwd: dir, encoding: "utf8" });
    expect(r.stderr).not.toContain("ENOENT");
    expect(r.stdout).toContain("ila");
  });

  it("bayda-repl runs a line", () => {
    const r = spawnSync("node", [repl], {
      cwd: os.tmpdir(),
      input: code + "\nexit\n",
      encoding: "utf8",
    });
    const out = r.stdout + r.stderr;
    expect(out).not.toContain("ENOENT");
    expect(out).toContain("ila");
  });
});
