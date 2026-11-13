// دروس النواة — نقية: بلا DOM ولا شبكة ولا eval ولا أي استيراد، فتعمل في Node وفي المتصفح.
// core/lessons.json بيانات غير موثوقة: تُفحص بقائمة بيضاء قبل أي استعمال، والناتج نسخة نظيفة.
// المفاهيم (print, if, while...) هي نفسها قيم keywords في حزم اللهجات. حقل requires يحدد اللهجات التي يناسبها الدرس،
// فيظهر الدرس الناجز لكل لهجة تستوفيه تلقائياً كلما اكتملت الحزم، دون تغيير في الكود.
// التحقق بنيوي فقط على شجرة translate() (Call / If / While) ولا يُنفَّذ أي كود.

export const LESSONS_SCHEMA = 1;
export const LESSONS_APP_ID = "bayda-lessons";
export const MODES = ["kid", "beginner", "pro"] as const;

export type Mode = (typeof MODES)[number];
export type Kind = "type" | "arrange";
export type NodeName = "if" | "while";

/** الحدود: النصوص قصيرة عمداً (الدروس للأطفال والمبتدئين). */
export const LESSON_LIMITS = {
  perMode: 100,
  title: 60,
  goal: 200,
  line: 300,
  lines: 6,
  hints: 4,
  code: 1000,
  cards: 8,
  rules: 8,
  requires: 12,
  bytes: 500000,
} as const;

/** شروط الفحص البنيوي: تتحقق كلها (AND) على شجرة البرنامج. */
export type Rule =
  | { op: "prints_text"; value: string }
  | { op: "prints_number"; value: string }
  | { op: "prints_bool"; value: "true" | "false" }
  | { op: "prints_in_order"; values: string[] }
  | { op: "min_prints"; min: number }
  | { op: "has_node"; node: NodeName }
  | { op: "min_nodes"; node: NodeName; min: number }
  | { op: "has_else" }
  | { op: "nested_if" }
  | { op: "test_token"; node: NodeName; value: string }
  | { op: "test_compares"; node: NodeName };

interface LessonBase {
  id: string;
  order: number;
  title: string;
  requires: string[];
}
/** هيكل بلا نص: ينتظر اكتمال الحزم وكتابة الدرس. */
export interface PlannedLesson extends LessonBase {
  status: "planned";
}
export interface ReadyLesson extends LessonBase {
  status: "ready";
  kind: Kind;
  goal: string;
  explain: string[];
  hints: string[];
  /** kind = type: الحل المرجعي. */
  template?: string;
  /** kind = arrange: بطاقات الشيفرة، والجواب فهارسها بالترتيب. */
  cards?: string[];
  answer?: number[];
  /** محاولة خاطئة صحيحة الصياغة: يجب أن تفشل في check (للاختبارات). */
  wrong: string;
  check: Rule[];
  feedback: { ok: string; wrong: string };
}
export type Lesson = PlannedLesson | ReadyLesson;

export interface LessonsData {
  app: string;
  schema: number;
  version: string;
  modes: Record<Mode, Lesson[]>;
}
export type LessonsCheck = { ok: true; data: LessonsData } | { ok: false; error: string };

export interface LockedLesson {
  id: string;
  title: string;
  status: Lesson["status"];
  /** المفاهيم التي تنقص اللهجة (فارغة إن كان الدرس مخطَّطاً فقط). */
  missing: string[];
}
export type FillResult = { ok: true; text: string } | { ok: false; missing: string[] };
export type Verdict = { status: "ok" } | { status: "wrong"; failed: Rule["op"] };

const ID = /^[a-z][a-z0-9-]{2,39}$/;
/** اسم مفهوم؛ المسافة المفردة تسمح بمفاهيم مثل "else if". */
const CONCEPT = /^[a-z][a-z0-9_]*(?: [a-z][a-z0-9_]*)*$/;
const SEMVER = /^\d+\.\d+\.\d+$/;
const WORD = /^[\p{L}\p{M}\p{N}][\p{L}\p{M}\p{N} _'-]{0,47}$/u;
const TOKEN = /^[a-z0-9_]{1,24}$/;
/** أحرف التحكم والاتجاه والمسافات المخفية. */
const UNSAFE = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u;
const URLISH = /:\/\/|www\./i;
/** بداية وسم HTML (علامة > وحدها مقبولة في النص لأنها تظهر في الشروط). */
const TAGISH = /<[A-Za-z!/?]/;
const SLOT = /\{\{([^{}]*)\}\}/g;
const FORBIDDEN: ReadonlySet<string> = new Set(["__proto__", "constructor", "prototype"]);

function isRec(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}
const hasForbidden = (o: Record<string, unknown>): boolean => Object.keys(o).some((k) => FORBIDDEN.has(k));
const isInt = (v: unknown, min: number, max: number): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;

function slotsOf(t: string): string[] {
  return Array.from(t.matchAll(SLOT), (m) => m[1]);
}
/** كل {{...}} اسم مفهوم صالح، ولا يبقى {{ أو }} خارج الخانات. */
function wellFormed(t: string): boolean {
  return slotsOf(t).every((s) => CONCEPT.test(s)) && !/\{\{|\}\}/.test(t.replace(SLOT, ""));
}

/** نص للعرض (textContent فقط): سطر واحد، بلا تحكم ولا وسوم ولا روابط. */
function prose(v: unknown, max: number, slots: boolean): v is string {
  if (typeof v !== "string" || v.length < 1 || v.length > max || v.trim() !== v) return false;
  if (UNSAFE.test(v) || TAGISH.test(v) || URLISH.test(v)) return false;
  return slots ? wellFormed(v) : !/[{}]/.test(v);
}
/** شيفرة: يسمح بسطر جديد فقط، ولا روابط ولا أحرف تحكم أو اتجاه. */
function code(v: unknown, max: number): v is string {
  if (typeof v !== "string" || v.length < 1 || v.length > max || v.trim() !== v || URLISH.test(v)) return false;
  return !UNSAFE.test(v.replace(/\n/g, "")) && wellFormed(v);
}
function strings(v: unknown, min: number, max: number, ok: (s: unknown) => boolean): string[] | null {
  if (!Array.isArray(v) || v.length < min || v.length > max) return null;
  return v.every(ok) ? (v.slice() as string[]) : null;
}

const word = (v: unknown): v is string => typeof v === "string" && WORD.test(v);

function cleanRule(r: unknown): Rule | null {
  if (!isRec(r) || hasForbidden(r)) return null;
  const node = r.node === "if" || r.node === "while" ? r.node : null;
  switch (r.op) {
    case "prints_text":
      return word(r.value) ? { op: "prints_text", value: r.value } : null;
    case "prints_number":
      return typeof r.value === "string" && /^\d{1,9}$/.test(r.value) ? { op: "prints_number", value: r.value } : null;
    case "prints_bool":
      return r.value === "true" || r.value === "false" ? { op: "prints_bool", value: r.value } : null;
    case "prints_in_order": {
      const v = r.values;
      return Array.isArray(v) && v.length >= 2 && v.length <= 4 && v.every(word)
        ? { op: "prints_in_order", values: v.slice() }
        : null;
    }
    case "min_prints":
      return isInt(r.min, 1, 20) ? { op: "min_prints", min: r.min } : null;
    case "has_node":
      return node ? { op: "has_node", node } : null;
    case "min_nodes":
      return node && isInt(r.min, 1, 10) ? { op: "min_nodes", node, min: r.min } : null;
    case "has_else":
      return { op: "has_else" };
    case "nested_if":
      return { op: "nested_if" };
    case "test_token":
      return node && typeof r.value === "string" && TOKEN.test(r.value) ? { op: "test_token", node, value: r.value } : null;
    case "test_compares":
      return node ? { op: "test_compares", node } : null;
    default:
      return null;
  }
}

function cleanReady(raw: Record<string, unknown>, base: LessonBase): ReadyLesson | string {
  const kind = raw.kind;
  if (kind !== "type" && kind !== "arrange") return "kind غير صالح";
  if (!prose(raw.goal, LESSON_LIMITS.goal, true)) return "goal غير صالح";
  const line = (s: unknown): boolean => prose(s, LESSON_LIMITS.line, true);
  const explain = strings(raw.explain, 1, LESSON_LIMITS.lines, line);
  if (!explain) return "explain غير صالح";
  const hints = raw.hints === undefined ? [] : strings(raw.hints, 0, LESSON_LIMITS.hints, line);
  if (!hints) return "hints غير صالح";
  if (!code(raw.wrong, LESSON_LIMITS.code)) return "wrong غير صالح";
  if (!Array.isArray(raw.check) || raw.check.length < 1 || raw.check.length > LESSON_LIMITS.rules) return "check غير صالح";
  const check: Rule[] = [];
  for (const r of raw.check) {
    const c = cleanRule(r);
    if (!c) return "check غير صالح";
    check.push(c);
  }
  const fb = raw.feedback;
  if (!isRec(fb) || hasForbidden(fb) || !prose(fb.ok, 200, false) || !prose(fb.wrong, 200, false)) {
    return "feedback غير صالح";
  }
  const out: ReadyLesson = {
    ...base,
    status: "ready",
    kind,
    goal: raw.goal,
    explain,
    hints,
    wrong: raw.wrong,
    check,
    feedback: { ok: fb.ok, wrong: fb.wrong },
  };
  if (kind === "type") {
    if (!code(raw.template, LESSON_LIMITS.code)) return "template غير صالح";
    out.template = raw.template;
  } else {
    const cards = strings(raw.cards, 2, LESSON_LIMITS.cards, (s) => code(s, LESSON_LIMITS.line));
    if (!cards) return "cards غير صالح";
    const a = raw.answer;
    if (
      !Array.isArray(a) ||
      a.length < 1 ||
      a.length > cards.length ||
      !a.every((n) => isInt(n, 0, cards.length - 1)) ||
      new Set(a).size !== a.length
    ) {
      return "answer غير صالح";
    }
    out.cards = cards;
    out.answer = a.slice();
  }
  const texts = [out.goal, ...out.explain, ...out.hints, out.wrong, ...(out.template ? [out.template] : []), ...(out.cards ?? [])];
  for (const t of texts) {
    for (const s of slotsOf(t)) {
      if (!base.requires.includes(s)) return "المفهوم {{" + s + "}} غير مذكور في requires";
    }
  }
  return out;
}

function cleanLesson(raw: unknown): Lesson | string {
  if (!isRec(raw) || hasForbidden(raw)) return "سجل غير صالح";
  if (typeof raw.id !== "string" || !ID.test(raw.id)) return "id غير صالح";
  const id = raw.id;
  if (!isInt(raw.order, 1, 999)) return id + ": order غير صالح";
  if (!prose(raw.title, LESSON_LIMITS.title, false)) return id + ": title غير صالح";
  const req = strings(raw.requires, 1, LESSON_LIMITS.requires, (s) => typeof s === "string" && s.length <= 40 && CONCEPT.test(s));
  if (!req || new Set(req).size !== req.length) return id + ": requires غير صالح";
  const base: LessonBase = { id, order: raw.order, title: raw.title, requires: req };
  if (raw.status === "planned") return { ...base, status: "planned" };
  if (raw.status !== "ready") return id + ": status غير صالح";
  const r = cleanReady(raw, base);
  return typeof r === "string" ? id + ": " + r : r;
}

const fail = (error: string): LessonsCheck => ({ ok: false, error });

/** يفحص كائن الدروس كاملاً ويعيد نسخة نظيفة مرتبة (المفاتيح غير المعروفة تُهمَل، والخطرة تُرفض). */
export function validateLessons(raw: unknown): LessonsCheck {
  try {
    if (!isRec(raw) || hasForbidden(raw)) return fail("ملف دروس غير صالح");
    if (raw.app !== LESSONS_APP_ID) return fail("ليس ملف دروس صالحاً");
    if (typeof raw.schema === "number" && raw.schema > LESSONS_SCHEMA) return fail("الملف أحدث من النواة");
    if (raw.schema !== LESSONS_SCHEMA) return fail("ليس ملف دروس صالحاً");
    if (typeof raw.version !== "string" || !SEMVER.test(raw.version)) return fail("رقم إصدار غير صالح");
    if (!isRec(raw.modes) || hasForbidden(raw.modes)) return fail("الأوضاع غير صالحة");
    const seen = new Set<string>();
    const modes: Record<Mode, Lesson[]> = { kid: [], beginner: [], pro: [] };
    for (const m of MODES) {
      const list = raw.modes[m];
      if (!Array.isArray(list) || list.length > LESSON_LIMITS.perMode) return fail("وضع غير صالح: " + m);
      const orders = new Set<number>();
      for (let i = 0; i < list.length; i++) {
        const where = m + "[" + i + "]";
        const r = cleanLesson(list[i]);
        if (typeof r === "string") return fail(where + " " + r);
        if (seen.has(r.id)) return fail(where + ": معرّف مكرر " + r.id);
        if (orders.has(r.order)) return fail(where + " " + r.id + ": ترتيب مكرر");
        seen.add(r.id);
        orders.add(r.order);
        modes[m].push(r);
      }
      modes[m].sort((a, b) => a.order - b.order);
    }
    return { ok: true, data: { app: LESSONS_APP_ID, schema: LESSONS_SCHEMA, version: raw.version, modes } };
  } catch {
    return fail("ملف دروس غير صالح");
  }
}

/** يقرأ نص JSON (من ملف أو تنزيل) ويفحصه. */
export function parseLessons(text: unknown): LessonsCheck {
  if (typeof text !== "string" || text.length === 0 || text.length > LESSON_LIMITS.bytes) {
    return fail("ملف غير صالح أو كبير جداً");
  }
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return fail("ملف غير صالح");
  }
  return validateLessons(data);
}

/** المفاهيم التي تغطيها اللهجة (قيم keywords). */
export function conceptsOf(keywords: Readonly<Record<string, string>>): Set<string> {
  const out = new Set<string>();
  for (const k of Object.keys(keywords)) {
    const v = keywords[k];
    if (typeof v === "string") out.add(v);
  }
  return out;
}

/** يملأ خانات {{مفهوم}} بأول كلمة للمفهوم في حزمة اللهجة؛ يبلّغ عن المفاهيم الناقصة. */
export function fillConcepts(text: string, keywords: Readonly<Record<string, string>>): FillResult {
  const missing: string[] = [];
  const words = Object.keys(keywords);
  const out = text.replace(SLOT, (m: string, name: string) => {
    const w = words.find((k) => keywords[k] === name);
    if (w === undefined) {
      if (!missing.includes(name)) missing.push(name);
      return m;
    }
    return w;
  });
  return missing.length ? { ok: false, missing } : { ok: true, text: out };
}

/** يركّب كود درس البطاقات من بطاقات مختارة بالترتيب؛ null إن كان الاختيار غير صالح. */
export function assemble(lesson: ReadyLesson, picks: ReadonlyArray<number>): string | null {
  const cards = lesson.cards;
  if (lesson.kind !== "arrange" || !cards || !Array.isArray(picks) || picks.length < 1 || picks.length > cards.length) {
    return null;
  }
  const out: string[] = [];
  for (const p of picks) {
    if (!Number.isInteger(p) || p < 0 || p >= cards.length) return null;
    out.push(cards[p]);
  }
  return out.join("\n");
}

/** الحل المرجعي للدرس (قبل ملء الخانات). */
export function solutionOf(lesson: ReadyLesson): string | null {
  if (lesson.kind === "type") return lesson.template ?? null;
  return lesson.answer ? assemble(lesson, lesson.answer) : null;
}

/** الدروس الناجزة التي تستوفي مفاهيمها اللهجة، مرتبة. */
export function lessonsFor(data: LessonsData, mode: Mode, keywords: Readonly<Record<string, string>>): ReadyLesson[] {
  if (!MODES.includes(mode)) return [];
  const have = conceptsOf(keywords);
  return data.modes[mode]
    .filter((l): l is ReadyLesson => l.status === "ready" && l.requires.every((c) => have.has(c)))
    .sort((a, b) => a.order - b.order);
}

/** ما لا يظهر بعد للهجة: دروس مخطَّطة، أو ناجزة تنقصها مفاهيم. */
export function lockedFor(data: LessonsData, mode: Mode, keywords: Readonly<Record<string, string>>): LockedLesson[] {
  if (!MODES.includes(mode)) return [];
  const have = conceptsOf(keywords);
  const out: LockedLesson[] = [];
  for (const l of [...data.modes[mode]].sort((a, b) => a.order - b.order)) {
    const missing = l.requires.filter((c) => !have.has(c));
    if (l.status === "ready" && missing.length === 0) continue;
    out.push({ id: l.id, title: l.title, status: l.status, missing });
  }
  return out;
}

interface Facts {
  printCalls: number;
  texts: string[];
  numbers: string[];
  bools: string[];
  count: Record<NodeName, number>;
  elses: number;
  nestedIf: boolean;
  tests: Record<NodeName, string[][]>;
}

/** يجمع الحقائق من شجرة translate(): Program / Call / If / While (يدخل في كل الكتل). */
function collect(ast: unknown): Facts {
  const f: Facts = {
    printCalls: 0,
    texts: [],
    numbers: [],
    bools: [],
    count: { if: 0, while: 0 },
    elses: 0,
    nestedIf: false,
    tests: { if: [], while: [] },
  };
  let budget = 10000;
  const list = (x: unknown): unknown[] => (Array.isArray(x) ? x : []);
  const values = (t: unknown): string[] =>
    isRec(t)
      ? list(t.tokens)
          .filter(isRec)
          .map((k) => k.value)
          .filter((v): v is string => typeof v === "string" && v.trim() !== "")
      : [];
  const arg = (a: unknown): void => {
    if (!isRec(a)) return;
    if ((a.type === "String" || a.type === "StringLiteral") && typeof a.value === "string") f.texts.push(a.value);
    else if ((a.type === "Number" || a.type === "NumberLiteral") && (typeof a.value === "string" || typeof a.value === "number")) {
      f.numbers.push(String(a.value));
    } else if (a.type === "Raw") {
      const v = values(a);
      if (v.length === 1 && (v[0] === "true" || v[0] === "false")) f.bools.push(v[0]);
    }
  };
  const visit = (n: unknown, depth: number, inIf: boolean): void => {
    if (!isRec(n) || depth > 200 || budget-- <= 0) return;
    if (n.type === "Program") {
      for (const c of list(n.body)) visit(c, depth + 1, inIf);
    } else if (n.type === "Call") {
      if (n.name === "print") {
        f.printCalls++;
        for (const a of list(n.args)) arg(a);
      }
    } else if (n.type === "If") {
      f.count.if++;
      if (inIf) f.nestedIf = true;
      if (Array.isArray(n.else)) f.elses++;
      f.tests.if.push(values(n.test));
      for (const c of list(n.then)) visit(c, depth + 1, true);
      for (const c of list(n.else)) visit(c, depth + 1, true);
    } else if (n.type === "While") {
      f.count.while++;
      f.tests.while.push(values(n.test));
      for (const c of list(n.body)) visit(c, depth + 1, inIf);
    }
  };
  visit(ast, 0, false);
  return f;
}

function holds(r: Rule, f: Facts): boolean {
  switch (r.op) {
    case "prints_text":
      return f.texts.includes(r.value);
    case "prints_number":
      return f.numbers.includes(r.value);
    case "prints_bool":
      return f.bools.includes(r.value);
    case "prints_in_order": {
      let i = 0;
      for (const t of f.texts) if (t === r.values[i]) i++;
      return i >= r.values.length;
    }
    case "min_prints":
      return f.printCalls >= r.min;
    case "has_node":
      return f.count[r.node] >= 1;
    case "min_nodes":
      return f.count[r.node] >= r.min;
    case "has_else":
      return f.elses >= 1;
    case "nested_if":
      return f.nestedIf;
    case "test_token":
      return f.tests[r.node].some((v) => v.includes(r.value));
    case "test_compares":
      return f.tests[r.node].some((v) => /[<>]|[=!]=/.test(v.join("")));
    default:
      return false;
  }
}

/** يفحص شجرة البرنامج بقواعد الدرس: يعيد الرمز الثابت لأول قاعدة فشلت (op) لتربطه الواجهة برسالة مترجمة. */
export function evaluateRules(ast: unknown, rules: ReadonlyArray<Rule>): Verdict {
  const f = collect(ast);
  for (const r of rules) if (!holds(r, f)) return { status: "wrong", failed: r.op };
  return { status: "ok" };
}
