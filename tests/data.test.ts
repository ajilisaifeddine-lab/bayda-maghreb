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

describe("dialect schema", () => {
  const dialectFiles = files.filter((f) => f.endsWith(".json") && f.includes("dialects"));
  it.each(dialectFiles)("%s matches DialectSchema", async (f) => {
    const { DialectSchema } = await import("../core/schema");
    expect(() => DialectSchema.parse(JSON.parse(fs.readFileSync(f, "utf8")))).not.toThrow();
  });
});

describe("dialect concepts", () => {
  const concepts = JSON.parse(fs.readFileSync("core/concepts.json", "utf8"))
  const allowed = new Set([...concepts.core, ...concepts.library])
  const dialectFiles = files.filter((f) => f.endsWith(".json") && f.includes("dialects"))
  it.each(dialectFiles)("%s keywords only use allowed values", (f) => {
    const kw = JSON.parse(fs.readFileSync(f, "utf8")).keywords
    const bad = [...new Set(Object.values(kw))].filter((v) => !allowed.has(v as string))
    expect(bad).toEqual([])
  })
})
