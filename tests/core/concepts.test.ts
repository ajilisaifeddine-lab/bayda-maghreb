import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "../..");
const packagesDir = path.join(root, "packages");
const concepts = JSON.parse(fs.readFileSync(path.join(root, "core/concepts.json"), "utf8"));

const ALLOWED = new Set<string>([...(concepts.core || []), ...(concepts.library || [])]);

const dirs = fs.readdirSync(packagesDir).filter((f) => fs.statSync(path.join(packagesDir, f)).isDirectory());

describe("concepts.json — كل كلمة لهجة تشير إلى مفهوم قياسي", () => {
  describe.each(dirs)("dialect %s", (dir) => {
    const kw = JSON.parse(fs.readFileSync(path.join(packagesDir, dir, "keywords.json"), "utf8"));

    it("كل القيم داخل core/library", () => {
      const bad = Object.entries(kw)
        .filter(([, v]) => !ALLOWED.has(v as string))
        .map(([k, v]) => `${k}->${v}`);
      expect({ bad }).toEqual({ bad: [] });
    });

    it("لا تحتوي بيانات وصفية (reviewStatus)", () => {
      expect(Object.keys(kw)).not.toContain("reviewStatus");
    });

    it("كل المفاتيح نصوص غير فارغة", () => {
      const bad = Object.entries(kw)
        .filter(([k, v]) => typeof k !== "string" || !k.trim() || typeof v !== "string")
        .map(([k]) => k);
      expect(bad).toEqual([]);
    });
  });
});
