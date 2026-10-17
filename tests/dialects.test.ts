import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("dialects", () => {
  const packagesDir = path.resolve(__dirname, "../../packages");
  if (!fs.existsSync(packagesDir)) {
    it("skips if packages dir missing", () => expect(true).toBe(true));
    return;
  }

  const dirs = fs.readdirSync(packagesDir).filter(f => fs.statSync(path.join(packagesDir, f)).isDirectory());

  describe.each(dirs)("dialect %s", (dir) => {
    it("has valid manifest and keywords", () => {
      const manifestPath = path.join(packagesDir, dir, "manifest.json");
      const keywordsPath = path.join(packagesDir, dir, "keywords.json");
      
      expect(fs.existsSync(manifestPath)).toBe(true);
      expect(fs.existsSync(keywordsPath)).toBe(true);
      
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      const keywords = JSON.parse(fs.readFileSync(keywordsPath, "utf8"));
      
      expect(manifest.id).toBeDefined();
      expect(typeof keywords).toBe("object");
    });
  });
});
