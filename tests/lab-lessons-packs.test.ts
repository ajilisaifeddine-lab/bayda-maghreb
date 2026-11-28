import { describe, it, expect, beforeEach } from "vitest";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { validateLessons, solutionOf, fillConcepts, evaluateRules } from "../core/lessons";
import { translate } from "../core/translate";
import { downloadDialectLessons, SOURCES } from "../apps/web-lab/downloader";
import { LessonStore, type StoreBackend } from "../apps/web-lab/store";
import * as E from "../apps/web-lab/engine";

const root = path.join(process.cwd(), "packages");
const cat = JSON.parse(fs.readFileSync(path.join(root, "catalog.json"), "utf8"));
const sha = async (b: ArrayBuffer): Promise<string> => crypto.createHash("sha256").update(Buffer.from(b)).digest("hex");
const enc = (s: string): Uint8Array => new TextEncoder().encode(s);

function memBackend(): StoreBackend {
  const m = new Map<string, unknown>();
  return { get: async (id) => m.get(id), put: async (id, v) => { m.set(id, v); }, remove: async (id) => { m.delete(id); }, keys: async () => [...m.keys()] };
}

describe("حزم الدروس لكل لهجة", () => {
  beforeEach(() => { for (const id of Object.keys(cat.dialects)) { E.removePack(id); E.removeLessonsPack(id); } });

  it("كل اللهجات الـ 13 تملك lessons.json صالحاً ومسجلاً في catalog.json وتنجح/تفشل قواعده", () => {
    const ids = Object.keys(cat.dialects);
    expect(ids.length).toBe(13);
    for (const id of ids) {
      expect(cat.dialects[id].files["lessons.json"]).toBeDefined();
      const raw = JSON.parse(fs.readFileSync(path.join(root, id, "lessons.json"), "utf8"));
      const v = validateLessons(raw);
      expect(v.ok, id + ": " + (v.ok ? "" : v.error)).toBe(true);
      const kw = JSON.parse(fs.readFileSync(path.join(root, id, "keywords.json"), "utf8"));
      if (v.ok) {
        for (const m of ["kid", "beginner", "pro"] as const) {
          for (const l of v.data.modes[m]) {
            if (l.status !== "ready") continue;
            const sol = solutionOf(l)!;
            const f1 = fillConcepts(sol, kw);
            expect(f1.ok, id + " " + l.id).toBe(true);
            const t1 = translate(f1.ok ? f1.text : "", { keywords: kw, id, target: "js" });
            expect(evaluateRules(t1.ast, l.check).status, id + " ok " + l.id).toBe("ok");
            const f2 = fillConcepts(l.wrong, kw);
            expect(f2.ok).toBe(true);
            const t2 = translate(f2.ok ? f2.text : "", { keywords: kw, id, target: "js" });
            expect(evaluateRules(t2.ast, l.check).status, id + " wrong " + l.id).toBe("wrong");
          }
        }
      }
    }
    const tn = fs.readFileSync(path.join(root, "tn-latn", "lessons.json"), "utf8");
    const tf = fs.readFileSync(path.join(root, "kab-tifinagh", "lessons.json"), "utf8");
    expect(tn).toContain("aslema");
    expect(tf).toContain("ⴰⵣⵓⵍ");
  });

  it("downloadDialectLessons ينزّل حزمة الدروس فقط ويتحقق من sha256 ويحفظها", async () => {
    const routes: Record<string, Uint8Array> = { [SOURCES.catalogUrl]: enc(JSON.stringify(cat)) };
    for (const id of Object.keys(cat.dialects)) {
      routes[SOURCES.fileUrl(cat.release, id, "lessons.json")] = new Uint8Array(fs.readFileSync(path.join(root, id, "lessons.json")));
    }
    const calls: string[] = [];
    const fetchFn = async (url: string) => { calls.push(url); return routes[url] ? new Response(routes[url], { status: 200 }) : new Response("404", { status: 404 }); };
    const r = await downloadDialectLessons("tn-latn", { fetchFn, sha256: sha });
    expect(r.ok).toBe(true);
    expect(calls.length).toBe(2);
    expect(calls[1]).toContain("/tn-latn/lessons.json");
    if (r.ok) {
      const store = new LessonStore(memBackend());
      const sv = await store.save("tn-latn", r.lessons, r.release, r.version);
      expect(sv.ok && sv.persistent).toBe(true);
      const loaded = await store.loadAll();
      expect(loaded.length).toBe(1);
      E.setDialect("tn-latn");
      E.installLessonsPack("tn-latn", loaded[0].lessons);
      const view = E.getLessonsView("kid");
      expect(view.installed).toBe(true);
      expect(view.ready.length).toBeGreaterThanOrEqual(2);
      expect(view.locked.length).toBeGreaterThanOrEqual(1);
    }
  });
});
