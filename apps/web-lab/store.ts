// تخزين حزم اللهجات المنزَّلة على جهاز المستخدم فقط. بلا شبكة ولا DOM، فيُختبر بلا متصفح.
// الجهاز غير موثوق أيضاً: كل قراءة تُفحص من جديد بـ core/pack.ts، والمعطوب يُحذف ولا يُستعمل.
import { validateDialectPack, type DialectPack } from "../../core/pack.js";
import { validateLessons, type LessonsData } from "../../core/lessons.js";
import type { Catalog } from "./downloader.js";

const DIALECT_ID = /^[a-z0-9][a-z0-9-]*$/i;
const RELEASE = /^v\d+\.\d+\.\d+$/;
const SEMVER = /^\d+\.\d+\.\d+$/;
export const MAX_STORED = 32;
const DB_NAME = "bayda_lab_packs";
const STORE_NAME = "packs";

export interface StoredPack {
  id: string;
  pack: DialectPack;
  release: string;
  version: string;
  savedAt: number;
}

/** منفذ التخزين: IndexedDB في المتصفح، وذاكرة في الاختبارات. */
export interface StoreBackend {
  get(id: string): Promise<unknown>;
  put(id: string, value: unknown): Promise<void>;
  remove(id: string): Promise<void>;
  keys(): Promise<string[]>;
}

export type SaveResult = { ok: true; persistent: boolean } | { ok: false; error: string };
export type LoadResult =
  | { ok: true; stored: StoredPack }
  | { ok: false; reason: "missing" | "corrupt" | "unavailable" };
export interface UpdateInfo {
  id: string;
  from: string;
  to: string;
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

/** يفحص سجلاً مقروءاً من الجهاز فحصاً كاملاً ويعيد نسخة نظيفة، أو null إن كان معطوباً. */
function parseRecord(id: string, raw: unknown): StoredPack | null {
  if (!isRecord(raw) || raw.id !== id) return null;
  const { release, version, savedAt } = raw;
  if (typeof release !== "string" || !RELEASE.test(release)) return null;
  if (typeof version !== "string" || !SEMVER.test(version)) return null;
  if (typeof savedAt !== "number" || !Number.isFinite(savedAt)) return null;
  const check = validateDialectPack(raw.pack);
  if (!check.ok) return null;
  if (check.data.manifest.id !== id || check.data.manifest.version !== version) return null;
  return { id, pack: check.data, release, version, savedAt };
}

export class PackStore {
  /** حزم لم تُحفظ على القرص (تعذّر التخزين الدائم): تعمل لهذه الجلسة فقط. */
  private readonly mem = new Map<string, StoredPack>();

  constructor(private readonly backend: StoreBackend | null) {}

  hasBackend(): boolean {
    return this.backend !== null;
  }

  /** لهجات تعمل في الذاكرة فقط ولن تبقى بعد إغلاق الصفحة (للتنبيه في الواجهة). */
  memoryOnlyIds(): string[] {
    return Array.from(this.mem.keys());
  }

  async save(id: string, pack: unknown, release: string, version: string): Promise<SaveResult> {
    if (typeof id !== "string" || !DIALECT_ID.test(id)) return { ok: false, error: "اسم لهجة غير صالح" };
    if (typeof release !== "string" || !RELEASE.test(release) || typeof version !== "string" || !SEMVER.test(version)) {
      return { ok: false, error: "بيانات الإصدار غير صالحة" };
    }
    const check = validateDialectPack(pack);
    if (!check.ok) return { ok: false, error: "الحزمة مرفوضة: " + check.error };
    if (check.data.manifest.id !== id) return { ok: false, error: "معرّف الحزمة لا يطابق اللهجة" };
    const stored: StoredPack = { id, pack: check.data, release, version, savedAt: Date.now() };
    if (this.backend) {
      try {
        const keys = await this.backend.keys();
        if (!keys.includes(id) && keys.length >= MAX_STORED) return { ok: false, error: "عدد اللهجات المخزّنة بلغ الحد" };
        await this.backend.put(id, stored); // الكتابة تستبدل القديم ذرّياً؛ إن فشلت بقي القديم
        this.mem.delete(id);
        return { ok: true, persistent: true };
      } catch {
        /* تعذّر التخزين الدائم: نكمل في الذاكرة لهذه الجلسة */
      }
    }
    this.mem.set(id, stored);
    return { ok: true, persistent: false };
  }

  async load(id: string): Promise<LoadResult> {
    if (typeof id !== "string" || !DIALECT_ID.test(id)) return { ok: false, reason: "missing" };
    const m = this.mem.get(id);
    if (m) return { ok: true, stored: m };
    if (!this.backend) return { ok: false, reason: "missing" };
    let raw: unknown;
    try {
      raw = await this.backend.get(id);
    } catch {
      return { ok: false, reason: "unavailable" };
    }
    if (raw === undefined || raw === null) return { ok: false, reason: "missing" };
    const rec = parseRecord(id, raw);
    if (!rec) {
      await this.dropFromBackend(id);
      return { ok: false, reason: "corrupt" };
    }
    return { ok: true, stored: rec };
  }

  /** كل الحزم الصالحة (تُفحص جميعها). المفاتيح الغريبة والزائدة عن الحد تُحذف. */
  async loadAll(): Promise<StoredPack[]> {
    const out: StoredPack[] = Array.from(this.mem.values());
    if (!this.backend) return out;
    let keys: string[];
    try {
      keys = await this.backend.keys();
    } catch {
      return out;
    }
    const valid: string[] = [];
    for (const k of keys) {
      if (typeof k === "string" && DIALECT_ID.test(k)) valid.push(k);
      else await this.dropFromBackend(k);
    }
    for (const k of valid.slice(MAX_STORED)) await this.dropFromBackend(k);
    for (const k of valid.slice(0, MAX_STORED)) {
      if (this.mem.has(k)) continue;
      const r = await this.load(k);
      if (r.ok) out.push(r.stored);
    }
    return out;
  }

  async remove(id: string): Promise<boolean> {
    if (typeof id !== "string" || !DIALECT_ID.test(id)) return false;
    this.mem.delete(id);
    return this.dropFromBackend(id);
  }

  private async dropFromBackend(id: string): Promise<boolean> {
    if (!this.backend) return true;
    try {
      await this.backend.remove(id);
      return true;
    } catch {
      return false;
    }
  }
}

/** يقارن رقمين من الشكل x.y.z رقمياً: -1 أو 0 أو 1، وnull إن كان أحدهما غير صالح. */
export function compareSemver(a: string, b: string): number | null {
  if (typeof a !== "string" || typeof b !== "string" || !SEMVER.test(a) || !SEMVER.test(b)) return null;
  const x = a.split(".").map(Number);
  const y = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1;
  }
  return 0;
}

/** اللهجات المثبّتة التي لها إصدار أحدث في الفهرس. */
export function findUpdates(catalog: Catalog, installed: ReadonlyArray<{ id: string; version: string }>): UpdateInfo[] {
  const out: UpdateInfo[] = [];
  for (const it of installed) {
    if (!Object.prototype.hasOwnProperty.call(catalog.dialects, it.id)) continue;
    const to = catalog.dialects[it.id].version;
    const c = compareSemver(it.version, to);
    if (c !== null && c < 0) out.push({ id: it.id, from: it.version, to });
  }
  return out;
}

/** منفذ ذاكرة للاختبارات (مع إمكانية حقن الأعطال بتغيير الخيارات أثناء الاختبار). */
export function createMemoryBackend(
  opts: { failPut?: boolean; failGet?: boolean; failKeys?: boolean } = {}
): StoreBackend & { raw: Map<string, unknown> } {
  const m = new Map<string, unknown>();
  return {
    raw: m,
    async get(id: string) {
      if (opts.failGet) throw new Error("get");
      return m.has(id) ? structuredClone(m.get(id)) : undefined;
    },
    async put(id: string, v: unknown) {
      if (opts.failPut) throw new Error("quota");
      m.set(id, structuredClone(v));
    },
    async remove(id: string) {
      m.delete(id);
    },
    async keys() {
      if (opts.failKeys) throw new Error("keys");
      return Array.from(m.keys());
    },
  };
}

/** منفذ IndexedDB الحقيقي، أو null إن لم يتوفر. يُختبر في المتصفح لا في Node. */
export function createIndexedDbBackend(dbName: string = DB_NAME, storeName: string = STORE_NAME): StoreBackend | null {
  let idb: IDBFactory | null = null;
  try {
    idb = typeof indexedDB === "undefined" ? null : indexedDB;
  } catch {
    idb = null;
  }
  if (!idb) return null;
  const factory: IDBFactory = idb;
  let dbp: Promise<IDBDatabase> | null = null;
  const open = (): Promise<IDBDatabase> => {
    if (dbp) return dbp;
    dbp = new Promise<IDBDatabase>((resolve, reject) => {
      const req = factory.open(dbName, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(storeName)) db.createObjectStore(storeName);
      };
      req.onsuccess = () => {
        const db = req.result;
        db.onversionchange = () => {
          db.close();
          dbp = null;
        };
        resolve(db);
      };
      req.onerror = () => {
        dbp = null;
        reject(req.error);
      };
      req.onblocked = () => {
        dbp = null;
        reject(new Error("blocked"));
      };
    });
    return dbp;
  };
  const run = async <T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> => {
    const db = await open();
    return new Promise<T>((resolve, reject) => {
      let result: T;
      const tx = db.transaction(storeName, mode);
      const req = fn(tx.objectStore(storeName));
      req.onsuccess = () => {
        result = req.result;
      };
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error("aborted"));
    });
  };
  return {
    get: (id) => run("readonly", (s) => s.get(id)),
    put: (id, value) => run("readwrite", (s) => s.put(value, id)).then(() => undefined),
    remove: (id) => run("readwrite", (s) => s.delete(id)).then(() => undefined),
    keys: () => run("readonly", (s) => s.getAllKeys()).then((k) => k.filter((x): x is string => typeof x === "string")),
  };
}

export interface StoredLessons { id: string; lessons: LessonsData; release: string; version: string; savedAt: number; }
function parseLessonRec(id: string, raw: unknown): StoredLessons | null {
  if (!isRecord(raw) || raw.id !== id) return null;
  const { release, version, savedAt } = raw;
  if (typeof release !== "string" || !RELEASE.test(release)) return null;
  if (typeof version !== "string" || !SEMVER.test(version)) return null;
  if (typeof savedAt !== "number" || !Number.isFinite(savedAt)) return null;
  const check = validateLessons(raw.lessons);
  return check.ok ? { id, lessons: check.data, release, version, savedAt } : null;
}
export class LessonStore {
  private readonly mem = new Map<string, StoredLessons>();
  constructor(private readonly backend: StoreBackend | null) {}
  async save(id: string, lessons: unknown, release: string, version: string): Promise<SaveResult> {
    if (typeof id !== "string" || !DIALECT_ID.test(id)) return { ok: false, error: "اسم لهجة غير صالح" };
    if (typeof release !== "string" || !RELEASE.test(release) || typeof version !== "string" || !SEMVER.test(version)) return { ok: false, error: "بيانات الإصدار غير صالحة" };
    const check = validateLessons(lessons);
    if (!check.ok) return { ok: false, error: "حزمة الدروس مرفوضة: " + check.error };
    const rec: StoredLessons = { id, lessons: check.data, release, version, savedAt: Date.now() };
    if (this.backend) {
      try {
        const keys = await this.backend.keys();
        if (!keys.includes(id) && keys.length >= MAX_STORED) return { ok: false, error: "بلغ الحد الأقصى للتخزين" };
        await this.backend.put(id, rec);
        this.mem.delete(id);
        return { ok: true, persistent: true };
      } catch {}
    }
    this.mem.set(id, rec);
    return { ok: true, persistent: false };
  }
  async loadAll(): Promise<StoredLessons[]> {
    const out: StoredLessons[] = Array.from(this.mem.values());
    if (!this.backend) return out;
    try {
      const keys = await this.backend.keys();
      for (const k of keys.slice(0, MAX_STORED)) {
        if (!DIALECT_ID.test(k) || this.mem.has(k)) continue;
        const raw = await this.backend.get(k);
        const rec = parseLessonRec(k, raw);
        if (rec) out.push(rec); else await this.backend.remove(k);
      }
    } catch {}
    return out;
  }
}
export const createLessonsIndexedDbBackend = (): StoreBackend | null => createIndexedDbBackend("bayda_lab_lessons", "lessons");
