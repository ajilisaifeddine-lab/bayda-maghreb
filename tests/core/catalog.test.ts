import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { createRequire } from "module";

const req = createRequire(path.join(process.cwd(), "package.json"));
const { buildCatalog, render } = req("./scripts/build-catalog.cjs");
const file = path.join(process.cwd(), "packages", "catalog.json");

describe("catalog — فهرس الإصدار والبصمات", () => {
  it("محدَّث: لا حزمة تغيّرت دون تشغيل npm run catalog", () => {
    expect(fs.existsSync(file)).toBe(true);
    expect(fs.readFileSync(file, "utf8")).toBe(render(buildCatalog()));
  });

  it("رقم الإصدار يطابق package.json", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
    const cat = JSON.parse(fs.readFileSync(file, "utf8"));
    expect(cat.release).toBe("v" + pkg.version);
    expect(cat.schema).toBe(1);
  });

  it("كل لهجة فيها الملفات الأساسية وبصمات صحيحة الشكل", () => {
    const cat = JSON.parse(fs.readFileSync(file, "utf8"));
    const ids = Object.keys(cat.dialects);
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) {
      const d = cat.dialects[id];
      expect(d.version).toMatch(/^\d+\.\d+\.\d+$/);
      for (const f of ["manifest.json", "keywords.json", "vocabulary.json"]) {
        expect(d.files[f], id + "/" + f).toBeDefined();
        expect(d.files[f].sha256).toMatch(/^[0-9a-f]{64}$/);
        expect(d.files[f].bytes).toBeGreaterThan(0);
      }
    }
  });
});
