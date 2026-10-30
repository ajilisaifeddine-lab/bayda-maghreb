// محرك المختبر — نقي (بلا DOM ولا شبكة ولا eval) فيُختبر مثل النواة.
// يربط translate() من النواة بمصدر واحد لكل لهجة (بلا دمج بين مصدرين):
//   1) حزمة منزَّلة اجتازت فحص core/pack.ts إن وُجدت
//   2) وإلا المثال المدمج في examples.ts
// الواجهة (ui.js) هي التي تقرأ المحرر وتكتب النتيجة بـ textContent.
import { translate, type Target } from "../../core/translate.js";
import { validateDialectPack, type DialectPack, type PackCheck } from "../../core/pack.js";
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
export interface LessonResult {
  status: "ok" | "wrong" | "error";
  message: string;
}

const packs = new Map<string, DialectPack>();
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
    const t: Target = target === "py" ? "py" : "js";
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

export const BaydaEngine = Object.freeze({
  setDialect,
  getDialect,
  hasPack,
  installPack,
  removePack,
  runCode,
  checkLesson,
});

declare global {
  interface Window {
    BaydaEngine?: typeof BaydaEngine;
  }
}

if (typeof window !== "undefined") {
  try {
    Object.defineProperty(window, "BaydaEngine", { value: BaydaEngine, writable: false, configurable: false });
  } catch {
    /* معرَّف مسبقاً */
  }
}
