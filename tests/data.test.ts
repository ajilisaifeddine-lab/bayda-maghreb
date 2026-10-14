import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const walk = (d: string): string[] =>
  fs.readdirSync(d, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]
  );
const files = [...walk("data")];

describe("data files", () => {
  it.each(files)("%s has no pasted shell lines", (f) => {
    expect(fs.readFileSync(f, "utf8")).not.toMatch(/^(cat >|EOF$)/m);
  });
  it.each(files.filter((f) => f.endsWith(".json")))("%s is valid JSON", (f) => {
    expect(() => JSON.parse(fs.readFileSync(f, "utf8"))).not.toThrow();
  });
});
