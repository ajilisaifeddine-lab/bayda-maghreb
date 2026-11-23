// دروس النواة: المخطط، المدقّق، الفاحص البنيوي، والمطابقة مع حزم اللهجات الحقيقية في packages/.
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { translate } from "../../core/translate";
import {
  MODES,
  assemble,
  conceptsOf,
  evaluateRules,
  fillConcepts,
  lessonsFor,
  lockedFor,
  parseLessons,
  solutionOf,
  validateLessons,
  type Lesson,
  type LessonsData,
  type Mode,
  type ReadyLesson,
} from "../../core/lessons";

const here = typeof __dirname === "string" ? __dirname : path.dirname(new URL(import.meta.url).pathname);
const root = path.resolve(here, "../..");
const text = fs.readFileSync(path.join(root, "core/lessons.json"), "utf8");
const parsed = parseLessons(text);
const data: LessonsData = parsed.ok
  ? parsed.data
  : { app: "", schema: 0, version: "0.0.0", modes: { kid: [], beginner: [], pro: [] } };

const concepts = JSON.parse(fs.readFileSync(path.join(root, "core/concepts.json"), "utf8"));
const known = new Set<string>([...concepts.core, ...concepts.library]);

const pkg = path.join(root, "packages");
const dialects = fs
  .readdirSync(pkg)
  .filter((d) => fs.existsSync(path.join(pkg, d, "keywords.json")))
  .sort();
const KW: Record<string, Record<string, string>> = {};
for (const d of dialects) {
  const raw = JSON.parse(fs.readFileSync(path.join(pkg, d, "keywords.json"), "utf8"));
  const kw: Record<string, string> = Object.create(null);
  for (const k of Object.keys(raw)) if (typeof raw[k] === "string") kw[k] = raw[k];
  KW[d] = kw;
}

const modeOfId = new Map<string, Mode>();
const all: Lesson[] = [];
for (const m of MODES) {
  for (const l of data.modes[m]) {
    modeOfId.set(l.id, m);
    all.push(l);
  }
}
const ready = all.filter((l): l is ReadyLesson => l.status === "ready");

function run(src: string, d: string, target: string, label: string) {
  try {
    return translate(src, { keywords: KW[d], id: d, target: target as any });
  } catch (e) {
    throw new Error(label + " — " + (e as Error).message);
  }
}

describe("دروس النواة — core/lessons.json", () => {
  it("الملف صالح بالمخطط ويحوي دروساً ناجزة في كل وضع", () => {
    expect(parsed.ok, parsed.ok ? "" : parsed.error).toBe(true);
    for (const m of MODES) expect(data.modes[m].some((l) => l.status === "ready"), m).toBe(true);
  });

  it("كل مفهوم في requires موجود في core/concepts.json", () => {
    for (const l of all) for (const c of l.requires) expect(known.has(c), l.id + ":" + c).toBe(true);
  });

  it("الحل المرجعي ينجح والمثال الخاطئ يفشل في كل لهجة تستوفي requires", () => {
    const extra: string[] = [];
    for (const l of ready) {
      let covered = 0;
      for (const d of dialects) {
        const kw = KW[d];
        const have = conceptsOf(kw);
        const supported = l.requires.every((c) => have.has(c));
        const shown = lessonsFor(data, modeOfId.get(l.id) as Mode, kw).some((x) => x.id === l.id);
        expect(shown, l.id + "@" + d).toBe(supported);
        if (!supported) continue;
        covered++;
        const label = l.id + "@" + d;
        const sol = fillConcepts(solutionOf(l) as string, kw);
        const bad = fillConcepts(l.wrong, kw);
        expect(sol.ok && bad.ok, label + " fill").toBe(true);
        if (!sol.ok || !bad.ok) continue;
        expect(evaluateRules(run(sol.text, d, "js", label).ast, l.check), label).toEqual({ status: "ok" });
        run(sol.text, d, "py", label);
        expect(evaluateRules(run(bad.text, d, "js", label + " wrong").ast, l.check).status, label + " wrong").toBe("wrong");
        for (const t of ["c", "cpp", "java", "php", "algo"]) {
          try {
            translate(sol.text, { keywords: KW[d], id: d, target: t as any });
          } catch (e) {
            extra.push(label + ":" + t + " " + (e as Error).message);
          }
        }
      }
      expect(covered, l.id + " بلا لهجة تغطيه").toBeGreaterThan(0);
    }
    // الأهداف الإضافية للعلم فقط: لا تُفشل الاختبار (دعم الكتّاب لها خارج نطاق الدروس).
    if (extra.length) console.warn("[lessons] أهداف إضافية فشلت ترجمتها:\n" + extra.join("\n"));
  });

  it("الدروس المخطَّطة لا تظهر في lessonsFor وتظهر في lockedFor مع المفاهيم الناقصة", () => {
    const planned = all.filter((l) => l.status === "planned");
    for (const l of planned) {
      for (const d of dialects) {
        const kw = KW[d];
        const mode = modeOfId.get(l.id) as Mode;
        expect(lessonsFor(data, mode, kw).some((x) => x.id === l.id), l.id + "@" + d).toBe(false);
        const lock = lockedFor(data, mode, kw).find((x) => x.id === l.id);
        expect(lock, l.id + "@" + d).toBeTruthy();
        expect(lock?.missing).toEqual(l.requires.filter((c) => !conceptsOf(kw).has(c)));
      }
    }
    const sample = JSON.parse(text);
    sample.modes.pro.push({ id: "pr-future", order: 99, title: "مستقبل", status: "planned", requires: ["function", "unknown_future"] });
    const check = validateLessons(sample);
    expect(check.ok).toBe(true);
    if (check.ok) {
      for (const d of dialects) {
        const kw = KW[d];
        expect(lessonsFor(check.data, "pro", kw).some((x) => x.id === "pr-future")).toBe(false);
        const lock = lockedFor(check.data, "pro", kw).find((x) => x.id === "pr-future");
        expect(lock?.status).toBe("planned");
        expect(lock?.missing).toEqual(["unknown_future"]);
      }
    }
  });

  it("المدقّق يرفض البيانات المعطوبة أو الخطرة", () => {
    const bad = (mut: (d: any) => void): boolean => {
      const d = JSON.parse(text);
      mut(d);
      return validateLessons(d).ok;
    };
    expect(validateLessons(JSON.parse(text)).ok).toBe(true);
    expect(bad((d) => (d.app = "x"))).toBe(false);
    expect(bad((d) => (d.schema = 2))).toBe(false);
    expect(bad((d) => (d.version = "1"))).toBe(false);
    expect(bad((d) => (d.modes.kid[0].title = "https://example.com"))).toBe(false);
    expect(bad((d) => (d.modes.kid[0].goal = "<script>"))).toBe(false);
    expect(bad((d) => (d.modes.kid[0].id = d.modes.kid[1].id))).toBe(false);
    expect(bad((d) => (d.modes.kid[0].order = d.modes.kid[1].order))).toBe(false);
    expect(bad((d) => (d.modes.kid[0].explain[0] = "{{unknown}}"))).toBe(false);
    expect(bad((d) => (d.modes.kid[0].answer = [5]))).toBe(false);
    expect(bad((d) => (d.modes.kid[0].check = [{ op: "evil" }]))).toBe(false);
    expect(bad((d) => (d.modes.kid[0].requires = []))).toBe(false);
    expect(bad((d) => (d.modes.beginner[0].template = "a\u202Eb"))).toBe(false);
    expect(bad((d) => (d.modes.beginner[0].template = "{{print}}{{"))).toBe(false);
    expect(bad((d) => (d.modes.beginner[0].status = "other"))).toBe(false);
    expect(validateLessons(JSON.parse('{"__proto__": {}, "app": "bayda-lessons"}')).ok).toBe(false);
    expect(parseLessons("x").ok).toBe(false);
    expect(parseLessons(5).ok).toBe(false);
    expect(parseLessons("").ok).toBe(false);
  });

  it("evaluateRules يدخل في If وWhile ويرفض الشجرة الفارغة", () => {
    const str = (v: string) => ({ type: "String", value: v });
    const print = (...a: unknown[]) => ({ type: "Call", name: "print", args: a });
    const raw = (...v: string[]) => ({ type: "Raw", tokens: v.map((x) => ({ type: "KEYWORD", value: x })) });
    const ast = {
      type: "Program",
      body: [
        { type: "While", test: raw("false"), body: [print(str("in-loop"))] },
        {
          type: "If",
          test: raw("true"),
          then: [{ type: "If", test: raw("5", ">", "3"), then: [print({ type: "Number", value: "7" })], else: null }],
          else: [print(str("b"))],
        },
      ],
    };
    const verdict = evaluateRules(ast, [
      { op: "prints_text", value: "in-loop" },
      { op: "has_node", node: "while" },
      { op: "test_token", node: "while", value: "false" },
      { op: "nested_if" },
      { op: "has_else" },
      { op: "test_compares", node: "if" },
      { op: "prints_number", value: "7" },
      { op: "prints_in_order", values: ["in-loop", "b"] },
      { op: "min_nodes", node: "if", min: 2 },
      { op: "min_prints", min: 3 },
    ]);
    expect(verdict).toEqual({ status: "ok" });
    expect(evaluateRules(ast, [{ op: "prints_text", value: "zzz" }])).toEqual({ status: "wrong", failed: "prints_text" });
    expect(evaluateRules(ast, [{ op: "prints_in_order", values: ["b", "in-loop"] }]).status).toBe("wrong");
    expect(evaluateRules(null, [{ op: "has_node", node: "if" }]).status).toBe("wrong");
  });

  it("fillConcepts يستعمل أول كلمة للمفهوم ويبلّغ عن الناقص، وassemble يرفض الاختيار الخطأ", () => {
    const kw = { قول: "print", كتب: "print", صح: "true" };
    expect(fillConcepts("{{print}}({{true}})", kw)).toEqual({ ok: true, text: "قول(صح)" });
    expect(fillConcepts("{{while}}", kw)).toEqual({ ok: false, missing: ["while"] });
    const l = ready.find((x) => x.kind === "arrange") as ReadyLesson;
    expect(assemble(l, [99])).toBeNull();
    expect(assemble(l, [])).toBeNull();
    expect(solutionOf(l)).toBe(assemble(l, l.answer as number[]));
  });
});
