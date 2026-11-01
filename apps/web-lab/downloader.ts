// منزِّل حزم اللهجات (المختبر ← النواة). بلا DOM: الشبكة والبصمة اعتماديات مُمرَّرة، فتُختبر بلا إنترنت.
// لا ثقة بما يأتي من الشبكة: لا يُقبل ملف قبل أن يطابق الحجم والبصمة (sha256) المعلنين في الفهرس،
// ثم تُفحص الحزمة كاملة بـ core/pack.ts. لا يُرفع أي شيء: طلبات GET فقط، بلا كوكيز ولا مرجع.
import { validateDialectPack, type DialectPack } from "../../core/pack.js";

/** يُعرَّف وقت البناء فقط (esbuild --define). false في البناء العادي فيُحذف المصدر المحلي من الحزمة. */
declare const __LOCAL_SOURCES__: boolean | undefined;

export interface Sources {
  catalogUrl: string;
  fileUrl: (release: string, id: string, file: string) => string;
}

/** مصادر التنزيل في مكان واحد. الفهرس من GitHub (طازج)، والملفات من jsDelivr بإصدار ثابت.
 *  المصدر المحلي لا يدخل إلا في بناء الاختبار (npm run lab:build:local). */
export const SOURCES: Sources =
  typeof __LOCAL_SOURCES__ !== "undefined" && __LOCAL_SOURCES__ === true
    ? {
        catalogUrl: "/packages/catalog.json",
        fileUrl: (_release: string, id: string, file: string): string => "/packages/" + id + "/" + file,
      }
    : {
        catalogUrl: "https://raw.githubusercontent.com/ajilisaifeddine-lab/bayda-maghreb/main/packages/catalog.json",
        fileUrl: (release: string, id: string, file: string): string =>
          "https://cdn.jsdelivr.net/gh/ajilisaifeddine-lab/bayda-maghreb@" + release + "/packages/" + id + "/" + file,
      };

export const SUPPORTED_SCHEMA = 1;
const MAX_FILE_BYTES = 1000000; // الحزم الحالية أصغر من 10 كيلوبايت
const MAX_CATALOG_BYTES = 200000;
const DEFAULT_TIMEOUT_MS = 15000;
const REQUIRED_FILES = ["manifest.json", "keywords.json", "vocabulary.json"] as const;
const DIALECT_ID = /^[a-z0-9][a-z0-9-]*$/i;
const RELEASE = /^v\d+\.\d+\.\d+$/;
const SEMVER = /^\d+\.\d+\.\d+$/;
const HEX64 = /^[0-9a-f]{64}$/;
const FILE_NAME = /^[a-z0-9][a-z0-9._-]*\.json$/i;

export interface CatalogFile {
  sha256: string;
  bytes: number;
}
export interface CatalogDialect {
  version: string;
  files: Record<string, CatalogFile>;
}
export interface Catalog {
  schema: number;
  release: string;
  dialects: Record<string, CatalogDialect>;
}
export type CatalogCheck = { ok: true; catalog: Catalog } | { ok: false; error: string };
export type DownloadResult =
  | { ok: true; pack: DialectPack; release: string; version: string }
  | { ok: false; error: string };

export interface DownloadDeps {
  fetchFn?: (url: string, init?: RequestInit) => Promise<Response>;
  sha256?: (data: ArrayBuffer) => Promise<string>;
  timeoutMs?: number;
}
interface Deps {
  fetchFn: (url: string, init?: RequestInit) => Promise<Response>;
  sha256: (data: ArrayBuffer) => Promise<string>;
  timeoutMs: number;
}

/** خطأ برسالة آمنة للعرض؛ غيره لا تُعرض رسالته. */
class DlError extends Error {}

const has = (o: object, k: string): boolean => Object.prototype.hasOwnProperty.call(o, k);
function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}
const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });

function messageOf(e: unknown): string {
  if (e instanceof DlError) return e.message;
  if (e instanceof Error && e.name === "AbortError") return "انتهت مهلة الاتصال";
  return "تعذّر الاتصال";
}

async function defaultSha256(data: ArrayBuffer): Promise<string> {
  const subtle = typeof crypto !== "undefined" ? crypto.subtle : undefined;
  if (!subtle) throw new DlError("التحقق من البصمة غير متاح (يلزم اتصال آمن https)");
  const digest = new Uint8Array(await subtle.digest("SHA-256", data));
  return Array.from(digest, (b) => b.toString(16).padStart(2, "0")).join("");
}

function withDefaults(d: DownloadDeps): Deps {
  return {
    fetchFn: d.fetchFn ?? ((url, init) => fetch(url, init)),
    sha256: d.sha256 ?? defaultSha256,
    timeoutMs: typeof d.timeoutMs === "number" && d.timeoutMs > 0 ? d.timeoutMs : DEFAULT_TIMEOUT_MS,
  };
}

/** يقرأ الجسم مع حد أقصى للحجم (يقطع القراءة عند التجاوز). */
async function readLimited(res: Response, max: number): Promise<ArrayBuffer> {
  const declared = Number(res.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > max) throw new DlError("حجم الملف أكبر من المسموح");
  const body = res.body;
  if (!body || typeof body.getReader !== "function") {
    const buf = await res.arrayBuffer();
    if (buf.byteLength > max) throw new DlError("حجم الملف أكبر من المسموح");
    return buf;
  }
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > max) {
      await reader.cancel();
      throw new DlError("حجم الملف أكبر من المسموح");
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out.buffer as ArrayBuffer;
}

async function fetchBytes(url: string, max: number, d: Deps, fresh: boolean): Promise<ArrayBuffer> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), d.timeoutMs);
  try {
    const init: RequestInit = {
      method: "GET",
      mode: "cors",
      credentials: "omit",
      referrerPolicy: "no-referrer",
      redirect: "follow",
      signal: ctrl.signal,
    };
    if (fresh) init.cache = "no-store";
    const res = await d.fetchFn(url, init);
    if (!res.ok) throw new DlError("فشل التنزيل (رمز " + res.status + ")");
    return await readLimited(res, max);
  } finally {
    clearTimeout(timer);
  }
}

function parseJson(buf: ArrayBuffer, name: string): unknown {
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(buf));
  } catch {
    throw new DlError("ملف غير صالح: " + name);
  }
}

/** يفحص بنية الفهرس بقائمة بيضاء ويعيد نسخة نظيفة (قواميس بلا نموذج أولي). */
export function validateCatalog(raw: unknown): CatalogCheck {
  try {
    if (!isRecord(raw)) return fail("فهرس غير صالح");
    if (raw.schema !== SUPPORTED_SCHEMA) {
      return fail(
        typeof raw.schema === "number" && raw.schema > SUPPORTED_SCHEMA
          ? "الفهرس أحدث من التطبيق، حدّث التطبيق"
          : "فهرس غير صالح"
      );
    }
    const release = raw.release;
    if (typeof release !== "string" || !RELEASE.test(release)) return fail("فهرس غير صالح: الإصدار");
    const ds = raw.dialects;
    if (!isRecord(ds)) return fail("فهرس غير صالح: اللهجات");
    const dialects: Record<string, CatalogDialect> = Object.create(null);
    for (const id of Object.keys(ds)) {
      if (!DIALECT_ID.test(id)) return fail("فهرس غير صالح: اسم لهجة");
      const entry = ds[id];
      if (!isRecord(entry)) return fail("فهرس غير صالح: " + id);
      const version = entry.version;
      const rawFiles = entry.files;
      if (typeof version !== "string" || !SEMVER.test(version) || !isRecord(rawFiles)) return fail("فهرس غير صالح: " + id);
      const files: Record<string, CatalogFile> = Object.create(null);
      for (const f of Object.keys(rawFiles)) {
        const m = rawFiles[f];
        if (!FILE_NAME.test(f) || !isRecord(m)) return fail("فهرس غير صالح: ملف في " + id);
        const sha = m.sha256;
        const bytes = m.bytes;
        if (typeof sha !== "string" || !HEX64.test(sha)) return fail("فهرس غير صالح: بصمة في " + id);
        if (typeof bytes !== "number" || !Number.isInteger(bytes) || bytes < 1 || bytes > MAX_FILE_BYTES) {
          return fail("فهرس غير صالح: حجم في " + id);
        }
        files[f] = { sha256: sha, bytes };
      }
      for (const need of REQUIRED_FILES) {
        if (!has(files, need)) return fail("فهرس غير صالح: ملف ناقص في " + id);
      }
      dialects[id] = { version, files };
    }
    return { ok: true, catalog: { schema: SUPPORTED_SCHEMA, release, dialects } };
  } catch {
    return fail("فهرس غير صالح");
  }
}

export async function fetchCatalog(deps: DownloadDeps = {}): Promise<CatalogCheck> {
  try {
    const d = withDefaults(deps);
    const buf = await fetchBytes(SOURCES.catalogUrl, MAX_CATALOG_BYTES, d, true);
    return validateCatalog(parseJson(buf, "catalog.json"));
  } catch (e) {
    return fail(messageOf(e));
  }
}

async function fetchVerifiedPart(catalog: Catalog, id: string, file: string, meta: CatalogFile, d: Deps): Promise<unknown> {
  const buf = await fetchBytes(SOURCES.fileUrl(catalog.release, id, file), meta.bytes, d, false);
  if (buf.byteLength !== meta.bytes) throw new DlError("حجم الملف لا يطابق الفهرس: " + file);
  let got: string;
  try {
    got = await d.sha256(buf);
  } catch (e) {
    throw e instanceof DlError ? e : new DlError("تعذّر التحقق من البصمة");
  }
  if (got !== meta.sha256) throw new DlError("بصمة الملف لا تطابق الفهرس: " + file);
  return parseJson(buf, file);
}

/** ينزّل لهجة من فهرس معلوم: حجم + بصمة لكل ملف، ثم فحص الحزمة، ثم مطابقة المعرّف والإصدار. */
export async function downloadFromCatalog(catalog: Catalog, id: string, d: Deps): Promise<DownloadResult> {
  try {
    if (typeof id !== "string" || !DIALECT_ID.test(id)) return fail("اسم لهجة غير صالح");
    const entry = has(catalog.dialects, id) ? catalog.dialects[id] : undefined;
    if (!entry) return fail("اللهجة غير موجودة في الإصدار الحالي");
    const raw: Record<string, unknown> = {};
    const parts: Array<[string, string]> = [
      ["manifest.json", "manifest"],
      ["keywords.json", "keywords"],
      ["vocabulary.json", "vocabulary"],
    ];
    for (const [file, key] of parts) {
      const meta = entry.files[file];
      if (!meta) return fail("ملف ناقص في الفهرس: " + file);
      raw[key] = await fetchVerifiedPart(catalog, id, file, meta, d);
    }
    const check = validateDialectPack(raw);
    if (!check.ok) return fail("الحزمة مرفوضة: " + check.error);
    if (check.data.manifest.id !== id) return fail("معرّف الحزمة لا يطابق اللهجة");
    if (check.data.manifest.version !== entry.version) return fail("إصدار الحزمة لا يطابق الفهرس");
    return { ok: true, pack: check.data, release: catalog.release, version: entry.version };
  } catch (e) {
    return fail(messageOf(e));
  }
}

export async function downloadDialect(id: string, deps: DownloadDeps = {}): Promise<DownloadResult> {
  try {
    if (typeof id !== "string" || !DIALECT_ID.test(id)) return fail("اسم لهجة غير صالح");
    const d = withDefaults(deps);
    const cat = await fetchCatalog(deps);
    if (!cat.ok) return fail(cat.error);
    return await downloadFromCatalog(cat.catalog, id, d);
  } catch (e) {
    return fail(messageOf(e));
  }
}
