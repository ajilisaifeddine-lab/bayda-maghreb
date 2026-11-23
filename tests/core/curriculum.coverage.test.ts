import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { normalize } from "../../core/normalizer.js";
import { translate } from "../../core/translate.js";
import { fillConcepts, parseLessons, MODES } from "../../core/lessons.js";

const root = path.resolve(__dirname, "../..");
const packagesDir = path.join(root, "packages");
const concepts = JSON.parse(fs.readFileSync(path.join(root, "core/concepts.json"), "utf8"));
const tierConcepts: string[] = [...(concepts.tiers?.tier1_basic ?? []), ...(concepts.tiers?.tier2_flow_vars ?? []), ...(concepts.tiers?.tier3_pro ?? [])];
const lessonsRes = parseLessons(fs.readFileSync(path.join(root, "core/lessons.json"), "utf8"));
const dirs = fs.readdirSync(packagesDir).filter((f) => fs.statSync(path.join(packagesDir, f)).isDirectory() && fs.existsSync(path.join(packagesDir, f, "manifest.json"))).sort();

describe("تغطية اللهجات للمفاهيم والمناهج", () => {
  it("core/concepts.json يعرّف مستويات التغطية", () => {
    expect(tierConcepts.length).toBeGreaterThanOrEqual(18);
    expect(lessonsRes.ok).toBe(true);
  });

  describe.each(dirs)("dialect %s", (dir) => {
    const kw: Record<string, string> = JSON.parse(fs.readFileSync(path.join(packagesDir, dir, "keywords.json"), "utf8"));
    const covered = new Set(Object.values(kw));

    it("يغطي جميع مفاهيم المستويات 1 و2 و3 ويملأ كل خاناتها", () => {
      expect(tierConcepts.filter((c) => !covered.has(c))).toEqual([]);
      for (const c of tierConcepts) expect(fillConcepts("{{" + c + "}}", kw).ok, dir + ":" + c).toBe(true);
    });

    it("يستوفي requires لكل الدروس في core/lessons.json", () => {
      if (!lessonsRes.ok) throw new Error(lessonsRes.error);
      const missing: string[] = [];
      for (const m of MODES) for (const l of lessonsRes.data.modes[m]) for (const r of l.requires) if (!covered.has(r)) missing.push(l.id + ":" + r);
      expect(missing).toEqual([]);
    });

    it("كل كلمة مفردة تُطبَّع لمفهومها وتعمل سلسلة else_if", () => {
      for (const [w, c] of Object.entries(kw)) {
        if (/\s/.test(w)) continue;
        const n = normalize([{ type: "IDENT", value: w, line: 1, col: 1 }], kw);
        expect(n[0]?.type, dir + ":" + w).toBe("KEYWORD");
        expect(n[0]?.value, dir + ":" + w).toBe(c);
      }
      const f = fillConcepts("{{if}} ({{true}}) { {{print}}(1) } {{else_if}} ({{false}}) { {{print}}(2) } {{else}} { {{print}}(3) }", kw);
      expect(f.ok).toBe(true);
      if (f.ok) expect(translate(f.text, { keywords: kw, id: dir, target: "js" }).code).toContain("else if");
    });
  });
});
