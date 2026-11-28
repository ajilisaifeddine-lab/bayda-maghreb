import { describe, it, expect, beforeEach } from "vitest";
import { BaydaEngine as E } from "../apps/web-lab/engine";
import { BaydaKidEngine as K, KID_LESSONS } from "../apps/web-lab/kid-engine";
import { examples } from "../apps/web-lab/examples";

beforeEach(() => {
  for (const id of Object.keys(examples)) E.removePack(id);
  E.setDialect("tn-latn");
});

describe("منطق وضع الطفل (مستكشف المنطق)", () => {
  it("يدعم التنفيذ الحقيقي للأكواد وإيقاف الإدخال التفاعلي", () => {
    const r = E.executeCode('goul("salam")');
    expect(r.ok).toBe(true);
    expect(r.outputs).toEqual(["salam"]);
  });

  it("يحسب المسار العمري تلقائياً أو يدوياً", () => {
    expect(K.resolveKidTier(0, "auto").band).toBe("4-5");
    expect(K.resolveKidTier(4, "auto").band).toBe("6-7");
    expect(K.resolveKidTier(9, "auto").band).toBe("8-9");
    expect(K.resolveKidTier(0, "8-9").levelNumber).toBe(3);
  });

  it("يبني كود لهجة صالح من بلاطات Scratch وينفّذه لكل اللهجات", () => {
    for (const id of Object.keys(examples)) {
      const st = E.setDialect(id);
      for (const band of ["4-5", "6-7", "8-9"] as const) {
        const blocks = K.buildKidStarterBlocks(band, st, "ar");
        const code = K.buildCodeFromKidBlocks(blocks, st.keywords);
        expect(code.length, id + ":" + band).toBeGreaterThan(0);
        const exec = E.executeCode(code);
        expect(exec.ok, id + ":" + band + " " + (exec.error || "")).toBe(true);
        expect(exec.outputs.length, id + ":" + band).toBeGreaterThan(0);
      }
    }
  });

  it("يحاكي روبوت الشبكة 4x4 ويكشف النجاح أو الصخرة", () => {
    const m = K.getRobotMissionsForBand("4-5")[0];
    const okRun = K.simulateRobotRun(["up", "up"], m);
    expect(okRun.solved).toBe(true);
    const rockRun = K.simulateRobotRun(["dir_right", "up"], m);
    expect(rockRun.hitRock).toBe(true);
    expect(rockRun.solved).toBe(false);
  });

  it("يتحقق من دروس وضع الطفل البصرية بالمحرك", () => {
    const st = E.getDialect();
    for (const lesson of KID_LESSONS) {
      const tiles = lesson.buildTiles(st.keywords);
      // Correct solution: ordered by expected id sequence (t1, t2)
      const ordered = [...tiles]
        .filter((t) => !(lesson.id === "kid-talk" && t.id === "t2"))
        .sort((a, b) => a.id.localeCompare(b.id))
        .map((t) => t.code);
      const res = K.verifyKidLesson(lesson, ordered, st);
      expect(res.ok, lesson.id).toBe(true);
      expect(res.outputs).toEqual(lesson.expectedOutputs);
    }
  });

  it("يكيّف الدروس التمهيدية لكل اللهجات دون كسر التحقق", () => {
    for (const id of Object.keys(examples)) {
      const st = E.setDialect(id);
      const loc = K.localizeKidLesson(KID_LESSONS[0], id);
      const tiles = loc.buildTiles(st.keywords).filter((t) => t.id === "t1").map((t) => t.code);
      const res = K.verifyKidLesson(loc, tiles, st);
      expect(res.ok, id).toBe(true);
      expect(res.outputs, id).toEqual(loc.expectedOutputs);
    }
  });

  it("يعاين ترجمة اللغة الهدف للمحترف", () => {
    const st = E.setDialect("tn-latn");
    const p = Object.keys(st.keywords).find((k) => st.keywords[k] === "print") || "goul";
    const res = E.previewTarget(`${p}("salam")`, "py");
    expect(res.ok).toBe(true);
    expect(res.code).toContain("print(");
  });
});
