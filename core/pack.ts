// فحص حزم اللهجات المُنزَّلة — آمن للمتصفح: لا Node ولا مكتبات خارجية.
// الحزمة المُنزَّلة بيانات غير موثوقة: تُفحص قبل الحفظ وعند كل قراءة، ولا يُنفَّذ منها شيء.
// الناتج نسخة نظيفة (قائمة بيضاء): المفاتيح غير المعروفة تُهمَل، والقواميس بلا نموذج أولي.

/** حدود الحجم (قيس عليها: أطول كلمة 29، أطول تفسير 22، أكبر قاموس 240). */
export const PACK_LIMITS = { keyMax: 48, valueMax: 96, keywordsMax: 1000, vocabularyMax: 5000 } as const;

export interface DialectPack {
  manifest: {
    id: string;
    version: string;
    name: string;
    code?: string;
    script?: string;
    reviewStatus?: string;
    description?: string;
    requiresConsent?: boolean;
  };
  keywords: Record<string, string>;
  vocabulary: Record<string, string>;
}
export type PackCheck = { ok: true; data: DialectPack } | { ok: false; error: string };

/** مفاتيح تُستعمل في تلويث النماذج الأولية (prototype pollution). */
const FORBIDDEN_KEYS: ReadonlySet<string> = new Set(["__proto__", "constructor", "prototype"]);
/** حرف أو رقم من أي لغة، وبين الأجزاء فاصل من 1 إلى 3 (مسافة _ ' -) فقط. */
const PACK_TEXT = /^[\p{L}\p{M}\p{N}]+(?:[ _'-]{1,3}[\p{L}\p{M}\p{N}]+)*$/u;
const STACKED_MARKS = /\p{M}{4,}/u;
const CONCEPT_ID = /^[a-z][a-z0-9_]*$/;
const DIALECT_ID = /^[a-z0-9][a-z0-9-]*$/i;
const SEMVER = /^\d+\.\d+\.\d+$/;
/** أحرف التحكم والاتجاه والمسافات المخفية. */
const UNSAFE_CHARS = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u;

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

function hasForbiddenKey(obj: Record<string, unknown>): boolean {
  return Object.keys(obj).some((k) => FORBIDDEN_KEYS.has(k));
}

function okText(t: unknown, max: number): t is string {
  return typeof t === "string" && t.length >= 1 && t.length <= max && PACK_TEXT.test(t) && !STACKED_MARKS.test(t);
}

function okLabel(t: unknown, max: number): t is string {
  return typeof t === "string" && t.length >= 1 && t.length <= max && !UNSAFE_CHARS.test(t);
}

const isConcept = (v: unknown): v is string =>
  typeof v === "string" && v.length >= 1 && v.length <= PACK_LIMITS.keyMax && CONCEPT_ID.test(v);
const isWord = (v: unknown): v is string => okText(v, PACK_LIMITS.valueMax);

function fail(error: string): PackCheck {
  return { ok: false, error };
}

function checkManifest(m: Record<string, unknown>): DialectPack["manifest"] | string {
  if (typeof m.id !== "string" || m.id.length > 40 || !DIALECT_ID.test(m.id)) return "معرّف غير صالح";
  if (typeof m.version !== "string" || !SEMVER.test(m.version)) return "رقم إصدار غير صالح";
  if (!okLabel(m.name, 80)) return "اسم غير صالح";
  const out: DialectPack["manifest"] = { id: m.id, version: m.version, name: m.name };
  const optional: Array<["code" | "script" | "reviewStatus" | "description", number]> = [
    ["code", 40],
    ["script", 20],
    ["reviewStatus", 20],
    ["description", 300],
  ];
  for (const [key, max] of optional) {
    const v = m[key];
    if (v === undefined) continue;
    if (!okLabel(v, max)) return "حقل غير صالح: " + key;
    out[key] = v;
  }
  if (m.requiresConsent !== undefined) {
    if (typeof m.requiresConsent !== "boolean") return "حقل غير صالح: requiresConsent";
    out.requiresConsent = m.requiresConsent;
  }
  return out;
}

function checkMap(
  obj: Record<string, unknown>,
  max: number,
  okValue: (v: unknown) => v is string,
  part: string
): Record<string, string> | string {
  const keys = Object.keys(obj);
  if (keys.length > max) return "عدد كبير في: " + part;
  const out: Record<string, string> = Object.create(null);
  for (const k of keys) {
    if (!okText(k, PACK_LIMITS.keyMax)) return "كلمة غير صالحة في: " + part;
    const v = obj[k];
    if (!okValue(v)) return "قيمة غير صالحة في: " + part;
    out[k] = v;
  }
  return out;
}

/** يفحص حزمة مُنزَّلة. لا يُرجع نص المدخل في رسالة الخطأ (اسم الجزء فقط). */
export function validateDialectPack(raw: unknown): PackCheck {
  try {
    if (!isRecord(raw)) return fail("الحزمة ليست كائناً");
    for (const part of ["manifest", "keywords", "vocabulary"] as const) {
      const v = raw[part];
      if (!isRecord(v)) return fail("جزء غير صالح: " + part);
      if (hasForbiddenKey(v)) return fail("مفتاح ممنوع في: " + part);
    }
    const manifest = checkManifest(raw.manifest as Record<string, unknown>);
    if (typeof manifest === "string") return fail(manifest);
    const keywords = checkMap(raw.keywords as Record<string, unknown>, PACK_LIMITS.keywordsMax, isConcept, "keywords");
    if (typeof keywords === "string") return fail(keywords);
    const vocabulary = checkMap(raw.vocabulary as Record<string, unknown>, PACK_LIMITS.vocabularyMax, isWord, "vocabulary");
    if (typeof vocabulary === "string") return fail(vocabulary);
    return { ok: true, data: { manifest, keywords, vocabulary } };
  } catch {
    return fail("تعذّر فحص الحزمة");
  }
}
