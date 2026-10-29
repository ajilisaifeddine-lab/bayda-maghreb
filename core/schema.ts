import {z} from 'zod'; export const DialectSchema=z.object({code:z.string(),name:z.string(),script:z.string(),keywords:z.record(z.string(),z.string()),vocabulary:z.record(z.string(),z.string()).optional(),symbols:z.record(z.string(),z.string()).optional(),kind:z.string().optional()});
export const SCHEMA_VERSION=1;


// ===== فحص حزم اللهجات المُنزَّلة (آمن للمتصفح، لا يستعمل Node) =====
// الحزمة المُنزَّلة بيانات غير موثوقة: تُفحص قبل الحفظ وعند كل قراءة، ولا يُنفَّذ منها شيء.

/** حدود الحجم (قيس عليها: أطول كلمة 29، أطول تفسير 22، أكبر قاموس 240). */
export const PACK_LIMITS = { keyMax: 48, valueMax: 96, keywordsMax: 1000, vocabularyMax: 5000 } as const;

/** مفاتيح تُستعمل في تلويث النماذج الأولية (prototype pollution). */
const FORBIDDEN_KEYS: ReadonlySet<string> = new Set(["__proto__", "constructor", "prototype"]);

/** حرف أو رقم من أي لغة، وبين الأجزاء فاصل من 1 إلى 3 (مسافة _ ' -) فقط. */
const PACK_TEXT = /^[\p{L}\p{M}\p{N}]+(?:[ _'-]{1,3}[\p{L}\p{M}\p{N}]+)*$/u;
const STACKED_MARKS = /\p{M}{4,}/u;
const CONCEPT_ID = /^[a-z][a-z0-9_]*$/;

const safeText = (max: number) =>
  z.string().min(1).max(max).regex(PACK_TEXT, "نص غير مسموح")
    .refine((t) => !STACKED_MARKS.test(t), "علامات متراكمة");

export const DialectPackSchema = z.object({
  manifest: z.object({
    id: z.string().min(1).max(40).regex(/^[a-z0-9][a-z0-9-]*$/i, "معرّف غير صالح"),
    version: z.string().regex(/^\d+\.\d+\.\d+$/, "رقم إصدار غير صالح"),
    name: z.string().min(1).max(80),
    code: z.string().max(40).optional(),
    script: z.string().max(20).optional(),
    requiresConsent: z.boolean().optional(),
    reviewStatus: z.string().max(20).optional(),
    description: z.string().max(300).optional(),
  }),
  keywords: z
    .record(safeText(PACK_LIMITS.keyMax), z.string().min(1).max(PACK_LIMITS.keyMax).regex(CONCEPT_ID, "مفهوم غير صالح"))
    .refine((r) => Object.keys(r).length <= PACK_LIMITS.keywordsMax, "كلمات كثيرة"),
  vocabulary: z
    .record(safeText(PACK_LIMITS.keyMax), safeText(PACK_LIMITS.valueMax))
    .refine((r) => Object.keys(r).length <= PACK_LIMITS.vocabularyMax, "مفردات كثيرة"),
});

export type DialectPack = z.infer<typeof DialectPackSchema>;
export type PackCheck = { ok: true; data: DialectPack } | { ok: false; error: string };

function isPlainRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

function hasForbiddenKey(obj: Record<string, unknown>): boolean {
  return Object.keys(obj).some((k) => FORBIDDEN_KEYS.has(k));
}

/** يفحص حزمة مُنزَّلة. لا يُرجع نص المدخل في رسالة الخطأ (اسم الجزء فقط). */
export function validateDialectPack(raw: unknown): PackCheck {
  try {
    if (!isPlainRecord(raw)) return { ok: false, error: "الحزمة ليست كائناً" };
    for (const part of ["manifest", "keywords", "vocabulary"] as const) {
      const v = raw[part];
      if (!isPlainRecord(v)) return { ok: false, error: "جزء غير صالح: " + part };
      if (hasForbiddenKey(v)) return { ok: false, error: "مفتاح ممنوع في: " + part };
    }
    const r = DialectPackSchema.safeParse(raw);
    if (!r.success) {
      const i = r.error.issues[0];
      return { ok: false, error: (i ? i.message : "بيانات غير صالحة") + " (" + String(i && i.path[0] !== undefined ? i.path[0] : "") + ")" };
    }
    return { ok: true, data: r.data };
  } catch {
    return { ok: false, error: "تعذّر فحص الحزمة" };
  }
}
