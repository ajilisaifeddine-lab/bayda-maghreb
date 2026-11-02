// دفتر المتعلم: منطق نقي (بلا DOM ولا شبكة) فيُختبر مثل النواة.
// سجلات منظمة بنص عادي فقط، تُعرض في الواجهة بـ textContent، فلا HTML ولا XSS من الدفتر.
// كل مدخل غير موثوق (مخزَّن أو مستورَد): يُفحص بقائمة بيضاء ويُنسخ سجلاً نظيفاً بمفاتيح معروفة فقط.

export type EntryType = "word" | "code" | "text";
export type Target = "js" | "py" | "";

export interface NotebookEntry {
  id: string;
  type: EntryType;
  /** معرّف اللهجة أو "" إن لم تحدَّد. */
  dialect: string;
  title: string;
  body: string;
  word: string;
  meaning: string;
  target: Target;
  /** صندوق المراجعة المتباعدة 1..5 (للكلمات). */
  box: number;
  /** موعد المراجعة القادمة (ms). */
  due: number;
  created: number;
}

export const LIMITS = { entries: 500, title: 80, body: 8000, word: 48, meaning: 96, importBytes: 1000000 } as const;
/** أيام الانتظار لكل صندوق (الفهرس = الصندوق - 1). */
export const INTERVAL_DAYS: readonly number[] = [0, 1, 3, 7, 14];
export const SCHEMA = 1;
export const APP_ID = "bayda-notebook";

const DAY_MS = 86400000;
const TYPES: readonly string[] = ["word", "code", "text"];
const DIALECT_ID = /^[a-z0-9][a-z0-9-]*$/i;
const ENTRY_ID = /^[a-z0-9][a-z0-9_-]{0,39}$/i;
/** أحرف التحكم والاتجاه والمخفية (تبقى المسافة والتبويب والسطر الجديد). */
const STRIP = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u200E\u200F\u061C\u202A-\u202E\u2066-\u2069\u2028\u2029\uFEFF]/g;

export type EntryCheck = { ok: true; entry: NotebookEntry } | { ok: false; error: string };
export type ImportResult = { ok: true; entries: NotebookEntry[]; skipped: number } | { ok: false; error: string };
export interface EntryFilter {
  type?: EntryType;
  dialect?: string;
  q?: string;
}

const bad = (error: string): { ok: false; error: string } => ({ ok: false, error });

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

const defaultId = (): string => "e" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

/** ينظّف نصاً: تطبيع، وإزالة المخفي، وتوحيد الأسطر، ثم يرفض ما تجاوز الحد (null). */
function clean(v: unknown, max: number, multiline: boolean): string | null {
  if (typeof v !== "string" || v.length > max * 4) return null;
  let s = v.normalize("NFC").replace(STRIP, "");
  s = multiline ? s.replace(/\r\n?/g, "\n") : s.replace(/[\t\n\r]+/g, " ");
  s = s.trim();
  return s.length <= max ? s : null;
}

/** يفحص سجلاً ويعيد نسخة نظيفة. السجلات الناقصة أو الكبيرة تُرفض. */
export function validateEntry(raw: unknown, now: number, newId: () => string = defaultId): EntryCheck {
  try {
    if (!isRecord(raw)) return bad("سجل غير صالح");
    const type = raw.type;
    if (typeof type !== "string" || !TYPES.includes(type)) return bad("نوع غير صالح");
    const t = type as EntryType;
    const dialect = raw.dialect === undefined ? "" : raw.dialect;
    if (typeof dialect !== "string" || (dialect !== "" && (dialect.length > 40 || !DIALECT_ID.test(dialect)))) {
      return bad("لهجة غير صالحة");
    }
    const body = raw.body === undefined ? "" : clean(raw.body, LIMITS.body, true);
    if (body === null) return bad("النص طويل أو غير صالح");
    let title = "";
    let word = "";
    let meaning = "";
    if (t === "word") {
      const w = clean(raw.word, LIMITS.word, false);
      const m = clean(raw.meaning, LIMITS.meaning, false);
      if (!w || !m) return bad("الكلمة والمعنى مطلوبان");
      word = w;
      meaning = m;
      title = w;
    } else {
      const ti = clean(raw.title, LIMITS.title, false);
      if (!ti) return bad("العنوان مطلوب");
      if (!body) return bad("المحتوى مطلوب");
      title = ti;
    }
    const tg = raw.target === undefined ? "" : raw.target;
    if (tg !== "" && tg !== "js" && tg !== "py") return bad("هدف غير صالح");
    const target: Target = t === "code" && (tg === "js" || tg === "py") ? tg : "";
    const box = raw.box === undefined ? 1 : raw.box;
    if (typeof box !== "number" || !Number.isInteger(box) || box < 1 || box > 5) return bad("صندوق غير صالح");
    const due = raw.due === undefined ? 0 : raw.due;
    const created = raw.created === undefined ? now : raw.created;
    if (typeof due !== "number" || !Number.isFinite(due) || due < 0) return bad("تاريخ غير صالح");
    if (typeof created !== "number" || !Number.isFinite(created) || created < 0) return bad("تاريخ غير صالح");
    const id = typeof raw.id === "string" && ENTRY_ID.test(raw.id) ? raw.id : newId();
    return { ok: true, entry: { id, type: t, dialect, title, body, word, meaning, target, box, due, created } };
  } catch {
    return bad("سجل غير صالح");
  }
}

/** سجل جديد من مدخلات المستخدم: صندوق 1 ومستحق الآن. */
export function createEntry(input: Record<string, unknown>, now: number, newId: () => string = defaultId): EntryCheck {
  return validateEntry({ ...input, id: undefined, box: 1, due: now, created: now }, now, newId);
}

/** مراجعة كلمة: "عرفتها" ترفعها صندوقاً، و"أعدها" ترجعها إلى الأول. */
export function review(entry: NotebookEntry, knew: boolean, now: number): NotebookEntry {
  const box = knew ? Math.min(5, Math.max(1, entry.box) + 1) : 1;
  return { ...entry, box, due: now + (INTERVAL_DAYS[box - 1] ?? 0) * DAY_MS };
}

/** الكلمات المستحقة للمراجعة: الأقدم موعداً أولاً، ثم الأدنى صندوقاً. */
export function dueEntries(entries: ReadonlyArray<NotebookEntry>, now: number): NotebookEntry[] {
  return entries.filter((e) => e.type === "word" && e.due <= now).sort((a, b) => a.due - b.due || a.box - b.box);
}

/** بحث ومرشحات؛ الأحدث أولاً. */
export function filterEntries(entries: ReadonlyArray<NotebookEntry>, f: EntryFilter = {}): NotebookEntry[] {
  const q = typeof f.q === "string" ? f.q.trim().toLowerCase() : "";
  return entries
    .filter(
      (e) =>
        (!f.type || e.type === f.type) &&
        (!f.dialect || e.dialect === f.dialect) &&
        (!q || [e.title, e.word, e.meaning, e.body].some((s) => s.toLowerCase().includes(q)))
    )
    .sort((a, b) => b.created - a.created);
}

export function exportNotebook(entries: ReadonlyArray<NotebookEntry>, now: number): string {
  return JSON.stringify({ app: APP_ID, schema: SCHEMA, exportedAt: now, entries }, null, 2);
}

/** يقرأ ملف استيراد: الحجم والبنية أولاً، ثم كل سجل على حدة (التالف والمكرر يُتخطى ويُعدّ). */
export function parseImport(text: unknown, now: number): ImportResult {
  try {
    if (typeof text !== "string" || text.length === 0 || text.length > LIMITS.importBytes) {
      return bad("ملف غير صالح أو كبير جداً");
    }
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      return bad("ملف غير صالح");
    }
    if (!isRecord(data) || data.app !== APP_ID) return bad("ليس ملف دفتر صالحاً");
    if (typeof data.schema === "number" && data.schema > SCHEMA) return bad("الملف أحدث من التطبيق، حدّث التطبيق");
    if (data.schema !== SCHEMA || !Array.isArray(data.entries)) return bad("ليس ملف دفتر صالحاً");
    const out: NotebookEntry[] = [];
    const seen = new Set<string>();
    let skipped = 0;
    for (const raw of data.entries) {
      if (out.length >= LIMITS.entries) {
        skipped++;
        continue;
      }
      const r = validateEntry(raw, now);
      if (!r.ok || seen.has(r.entry.id)) {
        skipped++;
        continue;
      }
      seen.add(r.entry.id);
      out.push(r.entry);
    }
    return { ok: true, entries: out, skipped };
  } catch {
    return bad("ملف غير صالح");
  }
}

/** دمج المستورد في الموجود: الموجود يغلب عند تطابق المعرّف، ولا يتجاوز الحد الأقصى. */
export function mergeEntries(
  existing: ReadonlyArray<NotebookEntry>,
  incoming: ReadonlyArray<NotebookEntry>
): { entries: NotebookEntry[]; added: number; dropped: number } {
  const out = existing.slice(0, LIMITS.entries);
  const seen = new Set(out.map((e) => e.id));
  let added = 0;
  let dropped = 0;
  for (const e of incoming) {
    if (seen.has(e.id) || out.length >= LIMITS.entries) {
      dropped++;
      continue;
    }
    out.push(e);
    seen.add(e.id);
    added++;
  }
  return { entries: out, added, dropped };
}
