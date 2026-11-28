// محرك المختبر — نقي (بلا DOM ولا شبكة ولا eval) فيُختبر مثل النواة.
// يربط translate() من النواة بمصدر واحد لكل لهجة (بلا دمج بين مصدرين):
//   1) حزمة منزَّلة اجتازت فحص core/pack.ts إن وُجدت
//   2) وإلا المثال المدمج في examples.ts
// الواجهة (ui.js) هي التي تقرأ المحرر وتكتب النتيجة بـ textContent.
import { translate, type Target } from "../../core/translate.js";
import type { Arg, Expr, Fn, Program, Stmt } from "../../core/ast.js";
import type { Token } from "../../core/types.js";
import { validateDialectPack, type DialectPack, type PackCheck } from "../../core/pack.js";
import { validateLessons, lessonsFor, lockedFor, fillConcepts, evaluateRules, type LessonsData, type LessonsCheck, type Mode, type ReadyLesson, type LockedLesson } from "../../core/lessons.js";
import { examples } from "./examples.js";

export const MAX_SOURCE_CHARS = 100_000;
const LESSON_TARGET = "salam";
const DIALECT_ID = /^[a-z0-9][a-z0-9-]*$/i;

export type DialectSource = "downloaded" | "example" | "none";
export interface DialectState {
  id: string;
  source: DialectSource;
  keywords: Record<string, string>;
  vocabulary: Record<string, string>;
}
export interface RunResult {
  ok: boolean;
  code?: string;
  error?: string;
}
export interface ExecuteResult {
  ok: boolean;
  outputs: string[];
  code?: string;
  error?: string;
  awaitingPrompt?: string;
}
export interface LessonResult {
  status: "ok" | "wrong" | "error";
  message: string;
}

const packs = new Map<string, DialectPack>();
const lessonPacks = new Map<string, LessonsData>();
const has = (o: object, k: string): boolean => Object.prototype.hasOwnProperty.call(o, k);

/** نسخة بلا نموذج أولي: لا تُحَلّ constructor أو toString إلى دوال النظام. */
function dict(src: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = Object.create(null);
  for (const k of Object.keys(src)) out[k] = src[k];
  return out;
}

function emptyState(id: string): DialectState {
  return { id, source: "none", keywords: dict({}), vocabulary: dict({}) };
}

function resolve(id: unknown): DialectState {
  if (typeof id !== "string" || !DIALECT_ID.test(id)) return emptyState("");
  const pack = packs.get(id);
  if (pack) {
    return { id, source: "downloaded", keywords: dict(pack.keywords), vocabulary: dict(pack.vocabulary) };
  }
  if (has(examples, id)) {
    const ex = examples[id];
    return { id, source: "example", keywords: dict(ex.keywords), vocabulary: dict(ex.vocabulary) };
  }
  return emptyState(id);
}

let current: DialectState = emptyState("");

function messageOf(e: unknown): string {
  const m = e instanceof Error ? e.message : "";
  return (m || "خطأ غير معروف").slice(0, 300);
}

const ready = (): boolean => Object.keys(current.keywords).length > 0;

export function setDialect(id: string): DialectState {
  current = resolve(id);
  return current;
}

export function getDialect(): DialectState {
  return current;
}

export function hasPack(id: string): boolean {
  return packs.has(id);
}

/** يفحص الحزمة (core/pack.ts) ويخزّنها في الذاكرة إن صحّت؛ المرفوضة لا تُخزَّن. */
export function installPack(raw: unknown): PackCheck {
  const r = validateDialectPack(raw);
  if (!r.ok) return r;
  packs.set(r.data.manifest.id, r.data);
  if (current.id === r.data.manifest.id) current = resolve(current.id);
  return r;
}

export function removePack(id: string): void {
  packs.delete(id);
  if (current.id === id) current = resolve(id);
}

export function runCode(source: string, target: string = "js"): RunResult {
  try {
    const code = typeof source === "string" ? source.trim() : "";
    if (!code) return { ok: false, error: "الرجاء كتابة كود أولاً." };
    if (code.length > MAX_SOURCE_CHARS) return { ok: false, error: "الكود أطول من الحد المسموح." };
    if (!ready()) return { ok: false, error: "اختر لهجة أولاً." };
    const valid: readonly Target[] = ["js", "py", "c", "cpp", "java", "php", "algo"];
    const t: Target = valid.includes(target as Target) ? (target as Target) : "js";
    const r = translate(code, { keywords: current.keywords, id: current.id, target: t });
    return { ok: true, code: r.code };
  } catch (e) {
    return { ok: false, error: messageOf(e) };
  }
}

type AstNode = { type?: unknown; value?: unknown; body?: unknown; args?: unknown; test?: unknown; then?: unknown; else?: unknown; left?: unknown; right?: unknown };
const list = (x: unknown): unknown[] => (Array.isArray(x) ? x : []);

/** يبحث في شجرة البرنامج عن نص محدد (بحد للعمق). */
export function containsString(node: unknown, target: string, depth = 0): boolean {
  if (!node || typeof node !== "object" || depth > 200) return false;
  const n = node as AstNode;
  const next = (c: unknown): boolean => containsString(c, target, depth + 1);
  if ((n.type === "StringLiteral" || n.type === "String") && n.value === target) return true;
  switch (n.type) {
    case "Program":
      return list(n.body).some(next);
    case "Call":
      return list(n.args).some(next);
    case "If":
      return next(n.test) || list(n.then).some(next) || list(n.else).some(next);
    case "BinaryExpression":
      return next(n.left) || next(n.right);
    default:
      return false;
  }
}

export function checkLesson(source: string): LessonResult {
  try {
    const code = typeof source === "string" ? source.trim() : "";
    if (!code) return { status: "error", message: "الرجاء كتابة كود أولاً." };
    if (code.length > MAX_SOURCE_CHARS) return { status: "error", message: "الكود أطول من الحد المسموح." };
    if (!ready()) return { status: "error", message: "اختر لهجة أولاً." };
    const { ast } = translate(code, { keywords: current.keywords, id: current.id, target: "js" });
    if (containsString(ast, LESSON_TARGET)) {
      return { status: "ok", message: "🎉 إجابة صحيحة! لقد تعلمت الطباعة بنجاح." };
    }
    return { status: "wrong", message: "⚠️ الصياغة صحيحة، لكن يجب أن تطبع كلمة 'salam' بالتحديد." };
  } catch (e) {
    return { status: "error", message: "❌ خطأ برمجي: " + messageOf(e) };
  }
}

/** نص الترحيب للمحرر: المثال المدمج، أو نص مبني من كلمات الحزمة المنزَّلة إن لم تحوِ كلمات المثال. */
export function sampleFor(id: string): string {
  if (typeof id !== "string" || !DIALECT_ID.test(id)) return "";
  const ex = has(examples, id) ? examples[id] : undefined;
  const pack = packs.get(id);
  if (!pack) return ex ? ex.sample : "";
  if (ex && Object.keys(ex.keywords).every((w) => has(pack.keywords, w) && pack.keywords[w] === ex.keywords[w])) {
    return ex.sample;
  }
  const word = (concept: string): string | undefined => Object.keys(pack.keywords).find((w) => pack.keywords[w] === concept);
  const p = word("print");
  if (!p) return "";
  const i = word("if");
  const tr = word("true");
  const hello = p + '("Hello")';
  return i && tr ? hello + "\n" + i + " (" + tr + ") {\n    " + p + '("Hi")\n}' : hello;
}


class ReturnSignal { constructor(public value: unknown) {} }
class FlowSignal { constructor(public kind: "break" | "continue") {} }
const INPUT_WAIT = "__BAYDA_AWAITING_INPUT__";

function toNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function toDisplay(v: unknown): string {
  if (v === null || v === undefined) return "null";
  if (Array.isArray(v)) return "[" + v.map(toDisplay).join(", ") + "]";
  return String(v);
}

export function executeAst(
  program: Program,
  opts: { onInput?: (prompt: string) => string; maxSteps?: number } = {}
): { outputs: string[]; error?: string } {
  const outputs: string[] = [];
  const maxSteps = opts.maxSteps ?? 2000;
  let steps = 0;
  const fns = new Map<string, Fn>();
  const scopes: Array<Map<string, unknown>> = [new Map()];

  const tick = () => {
    if (++steps > maxSteps) throw new Error("تجاوز البرنامج الحد الأقصى للخطوات.");
  };
  const getVar = (name: string): unknown => {
    for (let i = scopes.length - 1; i >= 0; i--) {
      if (scopes[i].has(name)) return scopes[i].get(name);
    }
    throw new Error("متغير غير معرّف: " + name);
  };
  const setVar = (name: string, val: unknown, declare: boolean): void => {
    if (name === "__proto__" || name === "constructor" || name === "prototype") return;
    if (declare) { scopes[scopes.length - 1].set(name, val); return; }
    for (let i = scopes.length - 1; i >= 0; i--) {
      if (scopes[i].has(name)) { scopes[i].set(name, val); return; }
    }
    scopes[scopes.length - 1].set(name, val);
  };

  const evalTokens = (rawTokens: Token[]): unknown => {
    const rawNoWs = rawTokens.filter((t) => !(t.type === "SYMBOL" && (t.value === " " || t.value === "\n")));
    const ts: Token[] = [];
    for (let k = 0; k < rawNoWs.length; k++) {
      const a = rawNoWs[k], b = rawNoWs[k + 1], c = rawNoWs[k + 2];
      if (a.type === "SYMBOL" && b?.type === "SYMBOL") {
        const ab = a.value + b.value;
        const abc = c?.type === "SYMBOL" ? ab + c.value : "";
        if (abc === "===" || abc === "!==") { ts.push({ ...a, value: abc }); k += 2; continue; }
        if (["==", "!=", "<=", ">=", "&&", "||"].includes(ab)) { ts.push({ ...a, value: ab }); k += 1; continue; }
      }
      ts.push(a);
    }
    let p = 0;
    const peek = () => ts[p];
    const next = () => ts[p++];
    const isOp = (v: string) => peek() && peek().value === v;
    const match = (...vs: string[]) => {
      const t = peek();
      if (t && vs.includes(t.value)) { p++; return t.value; }
      return null;
    };

    const parseOr = (): unknown => {
      let l = parseAnd();
      while (match("||", "or")) { const r = parseAnd(); l = Boolean(l) || Boolean(r); }
      return l;
    };
    const parseAnd = (): unknown => {
      let l = parseEq();
      while (match("&&", "and")) { const r = parseEq(); l = Boolean(l) && Boolean(r); }
      return l;
    };
    const parseEq = (): unknown => {
      let l = parseRel();
      let op: string | null;
      while ((op = match("==", "===", "!=", "!=="))) {
        const r = parseRel();
        l = (op === "==" || op === "===") ? l === r : l !== r;
      }
      return l;
    };
    const parseRel = (): unknown => {
      let l = parseAdd();
      let op: string | null;
      while ((op = match("<", "<=", ">", ">="))) {
        const r = parseAdd();
        const a = toNum(l), b = toNum(r);
        l = op === "<" ? a < b : op === "<=" ? a <= b : op === ">" ? a > b : a >= b;
      }
      return l;
    };
    const parseAdd = (): unknown => {
      let l = parseMul();
      let op: string | null;
      while ((op = match("+", "-"))) {
        const r = parseMul();
        if (op === "+") l = (typeof l === "string" || typeof r === "string") ? String(l ?? "") + String(r ?? "") : toNum(l) + toNum(r);
        else l = toNum(l) - toNum(r);
      }
      return l;
    };
    const parseMul = (): unknown => {
      let l = parseUnary();
      let op: string | null;
      while ((op = match("*", "/", "%"))) {
        const r = parseUnary();
        const a = toNum(l), b = toNum(r);
        if (op === "*") l = a * b;
        else if (op === "/") l = b === 0 ? 0 : a / b;
        else l = b === 0 ? 0 : a % b;
      }
      return l;
    };
    const parseUnary = (): unknown => {
      const op = match("!", "not", "-");
      if (op === "!" || op === "not") return !Boolean(parseUnary());
      if (op === "-") return -toNum(parseUnary());
      return parsePrimary();
    };
    const parseCallArgs = (): unknown[] => {
      const out: unknown[] = [];
      if (isOp(")")) { next(); return out; }
      while (peek()) {
        out.push(parseOr());
        if (match(",")) continue;
        if (isOp(")")) { next(); break; }
        break;
      }
      return out;
    };
    const parsePrimary = (): unknown => {
      const t = next();
      if (!t) return undefined;
      if (t.type === "STRING") return t.value;
      if (t.type === "NUMBER") return Number(t.value);
      if (t.type === "KEYWORD") {
        if (t.value === "true") return true;
        if (t.value === "false") return false;
        if (t.value === "null") return null;
      }
      if (t.value === "(") {
        const v = parseOr();
        if (isOp(")")) next();
        return v;
      }
      if (t.value === "[") {
        const arr: unknown[] = [];
        if (!isOp("]")) {
          while (peek()) {
            arr.push(parseOr());
            if (match(",")) continue;
            break;
          }
        }
        if (isOp("]")) next();
        return arr;
      }
      if (t.type === "IDENT" || t.type === "KEYWORD") {
        if (isOp("(")) {
          next();
          const args = parseCallArgs();
          return invokeCall(t.value, args);
        }
        let val = getVar(t.value);
        while (isOp("[")) {
          next();
          const idx = toNum(parseOr());
          if (isOp("]")) next();
          val = Array.isArray(val) ? val[idx] : undefined;
        }
        return val;
      }
      return undefined;
    };

    if (!ts.length) return undefined;
    return parseOr();
  };

  const evalArg = (a: Arg): unknown => {
    if (a.type === "String") return a.value;
    if (a.type === "Number") return Number(a.value);
    return evalTokens(a.tokens);
  };
  const evalExpr = (e: Expr): unknown => evalTokens(e.tokens);

  const invokeCall = (name: string, args: unknown[]): unknown => {
    if (name === "print") {
      outputs.push(args.map(toDisplay).join(" "));
      return undefined;
    }
    if (name === "input") {
      const prompt = args.length ? toDisplay(args[0]) : "";
      if (!opts.onInput) throw new Error(INPUT_WAIT);
      return opts.onInput(prompt);
    }
    if (name === "len") {
      const x = args[0];
      return Array.isArray(x) || typeof x === "string" ? x.length : 0;
    }
    if (name === "push") {
      const arr = args[0];
      if (Array.isArray(arr)) arr.push(args[1]);
      return Array.isArray(arr) ? arr.length : 0;
    }
    const fn = fns.get(name);
    if (!fn) throw new Error("دالة غير معرّفة: " + name);
    const local = new Map<string, unknown>();
    fn.params.forEach((param, idx) => local.set(param, args[idx]));
    scopes.push(local);
    try {
      runBlock(fn.body);
      return undefined;
    } catch (sig) {
      if (sig instanceof ReturnSignal) return sig.value;
      throw sig;
    } finally {
      scopes.pop();
    }
  };

  const runStmt = (st: Stmt): void => {
    tick();
    switch (st.type) {
      case "Call": {
        const args = st.args.map(evalArg);
        invokeCall(st.name, args);
        return;
      }
      case "Var": {
        setVar(st.name, evalExpr(st.value), st.declare);
        return;
      }
      case "If": {
        if (Boolean(evalExpr(st.test))) runBlock(st.then);
        else if (st.else) runBlock(st.else);
        return;
      }
      case "While": {
        while (Boolean(evalExpr(st.test))) {
          tick();
          try { runBlock(st.body); }
          catch (sig) {
            if (sig instanceof FlowSignal) {
              if (sig.kind === "break") break;
              continue;
            }
            throw sig;
          }
        }
        return;
      }
      case "For": {
        scopes.push(new Map());
        try {
          if (st.iterable) {
            const it = evalExpr(st.iterable);
            const items = Array.isArray(it) ? it : [];
            for (const item of items) {
              tick();
              setVar(st.variable, item, true);
              try { runBlock(st.body); }
              catch (sig) {
                if (sig instanceof FlowSignal) { if (sig.kind === "break") break; continue; }
                throw sig;
              }
            }
          } else {
            const start = st.start ? toNum(evalExpr(st.start)) : 0;
            const end = st.end ? toNum(evalExpr(st.end)) : 0;
            const step = start <= end ? 1 : -1;
            for (let v = start; step > 0 ? v <= end : v >= end; v += step) {
              tick();
              setVar(st.variable, v, true);
              try { runBlock(st.body); }
              catch (sig) {
                if (sig instanceof FlowSignal) { if (sig.kind === "break") break; continue; }
                throw sig;
              }
            }
          }
        } finally {
          scopes.pop();
        }
        return;
      }
      case "Fn": { fns.set(st.name, st); return; }
      case "Return": { throw new ReturnSignal(st.value ? evalExpr(st.value) : undefined); }
      case "Flow": { throw new FlowSignal(st.kind); }
      case "Try": {
        try { runBlock(st.body); }
        catch (err) {
          if (err instanceof ReturnSignal || err instanceof FlowSignal) throw err;
          scopes.push(new Map());
          if (st.param) setVar(st.param, err instanceof Error ? err.message : String(err), true);
          try { runBlock(st.handler); } finally { scopes.pop(); }
        }
        return;
      }
    }
  };

  const runBlock = (list: Stmt[]): void => {
    for (const s of list) runStmt(s);
  };

  try {
    runBlock(program.body);
    return { outputs };
  } catch (e) {
    if (e instanceof Error && e.message === INPUT_WAIT) throw e;
    return { outputs, error: messageOf(e) };
  }
}

export function executeCode(
  source: string,
  opts: { target?: string; inputs?: string[] } = {}
): ExecuteResult {
  try {
    const code = typeof source === "string" ? source.trim() : "";
    if (!code) return { ok: false, outputs: [], error: "الرجاء كتابة كود أولاً." };
    if (code.length > MAX_SOURCE_CHARS) return { ok: false, outputs: [], error: "الكود أطول من الحد المسموح." };
    if (!ready()) return { ok: false, outputs: [], error: "اختر لهجة أولاً." };
    const valid: readonly Target[] = ["js", "py", "c", "cpp", "java", "php", "algo"];
    const t: Target = valid.includes(opts.target as Target) ? (opts.target as Target) : "js";
    const translated = translate(code, { keywords: current.keywords, id: current.id, target: t });
    const inputs = Array.isArray(opts.inputs) ? opts.inputs : [];
    let idx = 0;
    let awaitingPrompt: string | undefined;
    try {
      const exec = executeAst(translated.ast, {
        onInput(prompt: string) {
          if (idx < inputs.length) return String(inputs[idx++] ?? "");
          awaitingPrompt = prompt || "";
          throw new Error(INPUT_WAIT);
        },
      });
      if (exec.error) return { ok: false, outputs: exec.outputs, code: translated.code, error: exec.error };
      return { ok: true, outputs: exec.outputs, code: translated.code };
    } catch (inner) {
      if (inner instanceof Error && inner.message === INPUT_WAIT) {
        return { ok: true, outputs: [], code: translated.code, awaitingPrompt };
      }
      return { ok: false, outputs: [], code: translated.code, error: messageOf(inner) };
    }
  } catch (e) {
    return { ok: false, outputs: [], error: messageOf(e) };
  }
}


export function installLessonsPack(id: string, raw: unknown): LessonsCheck {
  if (typeof id !== "string" || !DIALECT_ID.test(id)) return { ok: false, error: "اسم لهجة غير صالح" };
  const r = validateLessons(raw);
  if (r.ok) lessonPacks.set(id, r.data);
  return r;
}
export function hasLessonsPack(id: string): boolean { return lessonPacks.has(id); }
export function removeLessonsPack(id: string): void { lessonPacks.delete(id); }
export function getLessonsView(mode: Mode): { installed: boolean; ready: ReadyLesson[]; locked: LockedLesson[] } {
  const pack = lessonPacks.get(current.id);
  if (!pack) return { installed: false, ready: [], locked: [] };
  return { installed: true, ready: lessonsFor(pack, mode, current.keywords), locked: lockedFor(pack, mode, current.keywords) };
}
export function fillLessonCode(text: string) { return fillConcepts(text, current.keywords); }
export function checkLessonEntry(lessonId: string, source: string, mode: Mode): LessonResult {
  try {
    const code = typeof source === "string" ? source.trim() : "";
    if (!code) return { status: "error", message: "الرجاء كتابة كود أولاً." };
    if (code.length > MAX_SOURCE_CHARS) return { status: "error", message: "الكود أطول من الحد المسموح." };
    if (!ready()) return { status: "error", message: "اختر لهجة أولاً." };
    const pack = lessonPacks.get(current.id);
    const l = pack?.modes[mode]?.find((x) => x.id === lessonId && x.status === "ready");
    if (!l || l.status !== "ready") return checkLesson(source);
    const { ast } = translate(code, { keywords: current.keywords, id: current.id, target: "js" });
    const v = evaluateRules(ast, l.check);
    return v.status === "ok" ? { status: "ok", message: l.feedback.ok } : { status: "wrong", message: l.feedback.wrong };
  } catch (e) { return { status: "error", message: "❌ خطأ برمجي: " + messageOf(e) }; }
}

export function previewTarget(source: string, target?: string): { ok: boolean; code?: string; error?: string } {
  try {
    const code = typeof source === "string" ? source.trim() : "";
    if (!code) return { ok: false, error: "empty" };
    if (!ready()) return { ok: false, error: "no_dialect" };
    const valid: readonly Target[] = ["js", "py", "c", "cpp", "java", "php", "algo"];
    const t: Target = valid.includes(target as Target) ? (target as Target) : "js";
    return { ok: true, code: translate(code, { keywords: current.keywords, id: current.id, target: t }).code };
  } catch (e) { return { ok: false, error: messageOf(e) }; }
}

export const BaydaEngine = Object.freeze({
  setDialect,
  getDialect,
  hasPack,
  installPack,
  removePack,
  runCode,
  executeCode,
  checkLesson,
  sampleFor,
  installLessonsPack,
  hasLessonsPack,
  removeLessonsPack,
  getLessonsView,
  fillLessonCode,
  checkLessonEntry,
  previewTarget,
});

declare global {
  interface Window {
    BaydaEngine?: typeof BaydaEngine;
  }
}

if (typeof window !== "undefined") {
  try {
    Object.defineProperty(window, "BaydaEngine", { value: BaydaEngine, writable: false, configurable: false });
  } catch {}
}
