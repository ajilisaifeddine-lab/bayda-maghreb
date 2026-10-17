import { describe, it, expect } from "vitest";
import { loadDialect } from "../core/loader";
import fs from "node:fs";
import path from "node:path";

describe("Integration: All Dialects", () => {
  const packagesDir = path.resolve(__dirname, "../packages");
  const dirs = fs.readdirSync(packagesDir).filter(f => fs.statSync(path.join(packagesDir, f)).isDirectory());

  describe.each(dirs)("Dialect: %s", (dir) => {
    it("should load and have valid keywords", () => {
      const dialect = loadDialect(dir, { consent: true });
      expect(dialect).not.toBeNull();
      expect(dialect?.id).toBe(dir);
      expect(dialect?.keywords).toBeDefined();
      expect(Object.keys(dialect?.keywords || {}).length).toBeGreaterThan(0);
    });
  });
});
