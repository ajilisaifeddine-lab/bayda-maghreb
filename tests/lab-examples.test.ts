import { describe, it, expect } from "vitest";
import fs from "fs";
import { createRequire } from "module";
import path from "path";
import { examples } from "../apps/web-lab/examples";
import { translate } from "../core/translate";
import { validateDialectPack } from "../core/pack";

const root = path.join(process.cwd(), "packages");
const ids = fs.readdirSync(root).filter((d) => fs.statSync(path.join(root, d)).isDirectory()).sort();
const read = (id: string, f: string): Record<string, unknown> =>
  JSON.parse(fs.readFileSync(path.join(root, id, f), "utf8"));

describe("أمثلة المختبر المدمجة", () => {
  it("لكل لهجة في packages مثال، ولا مثال بلا حزمة", () => {
    expect(Object.keys(examples).sort()).toEqual(ids);
  });

  it("كلمات كل مثال وقاموسه تطابق الحزمة الأصلية حرفياً", () => {
    for (const id of ids) {
      const kw = read(id, "keywords.json");
      const vo = read(id, "vocabulary.json");
      for (const [w, c] of Object.entries(examples[id].keywords)) expect(kw[w], id + ":" + w).toBe(c);
      for (const [w, m] of Object.entries(examples[id].vocabulary)) expect(vo[w], id + ":" + w).toBe(m);
    }
  });

  it("كل مثال يُترجم إلى js وpy بناتج غير فارغ", () => {
    for (const id of ids) {
      for (const target of ["js", "py"] as const) {
        const r = translate(examples[id].sample, { keywords: examples[id].keywords, id, target });
        expect(r.code.trim().length, id + ":" + target).toBeGreaterThan(0);
      }
    }
  });

  it("بيانات الأمثلة تجتاز فاحص الحزم", () => {
    for (const id of ids) {
      const r = validateDialectPack({
        manifest: { id, version: "1.0.0", name: id },
        keywords: examples[id].keywords,
        vocabulary: examples[id].vocabulary,
      });
      expect(r.ok, id).toBe(true);
    }
  });

  it("حجم الأمثلة صغير (مدمجة دائماً)", () => {
    const size = fs.statSync(path.join(process.cwd(), "apps/web-lab/examples.ts")).size;
    expect(size).toBeLessThan(12000);
  });
});

describe("أمثلة المختبر — مُولَّدة ومحدَّثة", () => {
  it("الملف المسجَّل يطابق ناتج المولِّد (شغّل npm run dialects إن فشل)", () => {
    const req = createRequire(path.join(process.cwd(), "package.json"));
    const { buildExamples, render } = req("./scripts/build-dialects.cjs");
    const file = path.join(process.cwd(), "apps/web-lab/examples.ts");
    expect(fs.readFileSync(file, "utf8")).toBe(render(buildExamples()));
  });
});
