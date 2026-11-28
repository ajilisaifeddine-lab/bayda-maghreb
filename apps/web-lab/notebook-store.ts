// حالة دفتر المتعلم والتخزين المحلي. التخزين يُمرَّر من خارجه (localStorage في المتصفح، وذاكرة في الاختبارات).
// الجهاز غير موثوق: كل قراءة تُفحص من جديد بـ parseImport، ولا يُكتب فوق دفتر محفوظ بإصدار أحدث من التطبيق.
import {
  createEntry,
  review as reviewEntry,
  dueEntries,
  filterEntries,
  exportNotebook,
  parseImport,
  mergeEntries,
  LIMITS,
  SCHEMA,
  type NotebookEntry,
  type EntryFilter,
} from "./notebook.js";

export const STORAGE_KEY = "baydaNotebook";

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export type AddResult = { ok: true; entry: NotebookEntry; persistent: boolean } | { ok: false; error: string };
export type ActionResult = { ok: true; persistent: boolean } | { ok: false; error: string };
export type ImportOutcome =
  | { ok: true; added: number; dropped: number; skipped: number; persistent: boolean }
  | { ok: false; error: string };
export interface Counts {
  total: number;
  words: number;
  code: number;
  text: number;
  due: number;
}

const LOCKED = "الدفتر محفوظ بإصدار أحدث من التطبيق، حدّث التطبيق";
const clone = (e: NotebookEntry): NotebookEntry => ({ ...e });

export class Notebook {
  private list: NotebookEntry[] = [];
  private persistent: boolean;
  private locked = false;

  constructor(
    private readonly storage: KeyValueStorage | null,
    private readonly clock: () => number = Date.now
  ) {
    this.persistent = storage !== null;
    this.load();
  }

  private load(): void {
    if (!this.storage) return;
    let raw: string | null;
    try {
      raw = this.storage.getItem(STORAGE_KEY);
    } catch {
      this.persistent = false;
      return;
    }
    if (raw === null) return;
    const r = parseImport(raw, this.clock());
    if (r.ok) {
      this.list = r.entries;
      return;
    }
    try {
      const j: unknown = JSON.parse(raw);
      if (typeof j === "object" && j !== null && !Array.isArray(j)) {
        const sc = (j as { schema?: unknown }).schema;
        if (typeof sc === "number" && sc > SCHEMA) this.locked = true;
      }
    } catch {
      /* تالف: يُهمل ويُستبدل عند أول حفظ */
    }
  }

  private commit(next: NotebookEntry[]): ActionResult {
    if (this.locked) return { ok: false, error: LOCKED };
    const text = exportNotebook(next, this.clock());
    if (text.length > LIMITS.importBytes) return { ok: false, error: "الدفتر بلغ الحجم الأقصى" };
    this.list = next;
    if (this.storage) {
      try {
        this.storage.setItem(STORAGE_KEY, text);
        this.persistent = true;
      } catch {
        this.persistent = false;
      }
    } else {
      this.persistent = false;
    }
    return { ok: true, persistent: this.persistent };
  }

  add(input: Record<string, unknown>): AddResult {
    const r = createEntry(input, this.clock());
    if (!r.ok) return r;
    const e = r.entry;
    if (this.list.length >= LIMITS.entries) return { ok: false, error: "الدفتر ممتلئ" };
    if (this.list.some((x) => x.id === e.id)) return { ok: false, error: "تعذّر الإنشاء، حاول مرة أخرى" };
    if (e.type === "word") {
      const w = e.word.toLowerCase();
      if (this.list.some((x) => x.type === "word" && x.dialect === e.dialect && x.word.toLowerCase() === w)) {
        return { ok: false, error: "الكلمة محفوظة مسبقاً" };
      }
    }
    const c = this.commit([...this.list, e]);
    return c.ok ? { ok: true, entry: clone(e), persistent: c.persistent } : c;
  }

  remove(id: string): ActionResult {
    if (typeof id !== "string" || !this.list.some((e) => e.id === id)) return { ok: false, error: "السجل غير موجود" };
    return this.commit(this.list.filter((e) => e.id !== id));
  }

  review(id: string, knew: boolean): ActionResult {
    const cur = typeof id === "string" ? this.list.find((e) => e.id === id) : undefined;
    if (!cur || cur.type !== "word") return { ok: false, error: "الكلمة غير موجودة" };
    const upd = reviewEntry(cur, knew === true, this.clock());
    return this.commit(this.list.map((e) => (e.id === id ? upd : e)));
  }

  entries(): NotebookEntry[] {
    return this.list.map(clone);
  }

  search(f: EntryFilter = {}): NotebookEntry[] {
    return filterEntries(this.list, f).map(clone);
  }

  due(): NotebookEntry[] {
    return dueEntries(this.list, this.clock()).map(clone);
  }

  counts(): Counts {
    const l = this.list;
    return {
      total: l.length,
      words: l.filter((e) => e.type === "word").length,
      code: l.filter((e) => e.type === "code").length,
      text: l.filter((e) => e.type === "text").length,
      due: this.due().length,
    };
  }

  exportText(): string {
    return exportNotebook(this.list, this.clock());
  }

  importText(text: unknown): ImportOutcome {
    const r = parseImport(text, this.clock());
    if (!r.ok) return r;
    const m = mergeEntries(this.list, r.entries);
    const c = this.commit(m.entries);
    return c.ok ? { ok: true, added: m.added, dropped: m.dropped, skipped: r.skipped, persistent: c.persistent } : c;
  }

  isPersistent(): boolean {
    return this.persistent;
  }

  isLocked(): boolean {
    return this.locked;
  }
}

/** التخزين الحقيقي في المتصفح، أو null إن لم يتوفر (قد يرمي الوصول إليه في بعض الأوضاع). */
export function browserStorage(): KeyValueStorage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

/** الواجهة المعروضة للصفحة: مجمَّدة، بلا وصول إلى الحالة الداخلية. */
export function createNotebookApi(nb: Notebook) {
  return Object.freeze({
    add: (input: Record<string, unknown>) => nb.add(input),
    remove: (id: string) => nb.remove(id),
    review: (id: string, knew: boolean) => nb.review(id, knew),
    entries: () => nb.entries(),
    search: (f?: EntryFilter) => nb.search(f),
    due: () => nb.due(),
    counts: () => nb.counts(),
    exportText: () => nb.exportText(),
    importText: (text: unknown) => nb.importText(text),
    isPersistent: () => nb.isPersistent(),
    isLocked: () => nb.isLocked(),
  });
}
export type NotebookApi = ReturnType<typeof createNotebookApi>;
