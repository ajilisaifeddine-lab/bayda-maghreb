import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { DialectSchema } from "./schema.js";
import { BaydaError } from "./errors.js";

export interface DialectPackage {
  id: string;
  manifest: any;
  /** كلمات اللهجة فقط (بدون بيانات وصفية مثل reviewStatus). */
  keywords: Record<string, string>;
  vocabulary: Record<string, string>;
}

/** مفاتيح تُعدّ بيانات وصفية لا كلمات برمجية. */
const METADATA_KEYS = new Set(["reviewStatus", "review", "status", "$schema"]);

/**
 * اسم اللهجة المسموح: حروف لاتينية/أرقام/شرطة فقط.
 * يمنع path traversal (مثل "../../etc") ومحارف الفصل.
 */
const SAFE_NAME = /^[a-z0-9][a-z0-9-]*$/i;

function stripMetadata(obj: Record<string, any>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj || {})) {
    if (METADATA_KEYS.has(k)) continue;
    if (typeof v !== "string") continue;
    out[k] = v;
  }
  return out;
}

/**
 * يتحقق أن الاسم آمن، ويرمي خطأً واضحاً إن لم يكن.
 */
export function assertSafeDialectName(name: unknown): asserts name is string {
  if (typeof name !== "string" || !SAFE_NAME.test(name)) {
    throw new BaydaError("INVALID_DIALECT_NAME", `اسم لهجة غير صالح: ${String(name)}`, {
      name,
    });
  }
}

/**
 * يتأكد أن المسار النهائي يقع فعلياً داخل الجذر (حماية مزدوجة ضد traversal).
 */
function assertInsideRoot(root: string, target: string): void {
  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(target);
  const rel = path.relative(resolvedRoot, resolvedTarget);
  if (rel === "" || rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new BaydaError("PATH_ESCAPE", `المسار خارج مجلد الحِزَم: ${resolvedTarget}`, {
      root: resolvedRoot,
      target: resolvedTarget,
    });
  }
}

/** يبحث عن جذر المستودع (الذي يحتوي مجلد packages) بدءاً من مواقع معقولة. */
function findPackagesRoot(): string | null {
  const candidates: string[] = [];

  // 1) نسبةً إلى موقع هذه الوحدة (core/ → ..)
  try {
    const here = path.dirname(fileURLToPath(import.meta.url));
    candidates.push(path.resolve(here, "..", "packages"));
    candidates.push(path.resolve(here, "..", "..", "packages")); // dist/core → repo/packages
  } catch {
    /* import.meta.url غير متاح في بعض البيئات */
  }

  // 2) نسبةً إلى مجلد العمل الحالي
  candidates.push(path.join(process.cwd(), "packages"));

  for (const c of candidates) {
    try {
      if (fs.existsSync(c) && fs.statSync(c).isDirectory()) return c;
    } catch {
      /* تجاهل */
    }
  }
  return null;
}

export function loadDialect(
  name: string,
  options: { consent?: boolean; packagesDir?: string } = {}
): DialectPackage | null {
  // --- الطبقة 1: تحصين الاسم ضد path traversal ---
  assertSafeDialectName(name);

  const consent = options.consent ?? false;

  const root = options.packagesDir || findPackagesRoot();
  if (!root) return null;

  const pkgDir = path.join(root, name);

  // --- الطبقة 2: التأكد أن المسار داخل الجذر ---
  assertInsideRoot(root, pkgDir);

  const manifestPath = path.join(pkgDir, "manifest.json");

  if (!fs.existsSync(manifestPath)) {
    return null;
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

  // --- الطبقة 3: التحقق من المخطط (zod) — تحذيري لا يكسر التوافق ---
  try {
    const parsed = DialectSchema.safeParse({
      code: manifest.code ?? name,
      name: manifest.name ?? name,
      script: manifest.script ?? "latn",
      keywords: {},
      ...manifest,
    });
    if (!parsed.success) {
      // نُسجّل التحذير دون إفشال التحميل (الحِزَم القديمة قد تنقص حقولاً).
      console.warn(
        `SCHEMA_WARNING (${name}):`,
        parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")
      );
    }
  } catch {
    /* zod غير متاح في بعض البيئات — نتجاهل */
  }

  if (manifest.requiresConsent && !consent) {
    throw new BaydaError("CONSENT_REQUIRED", "اللهجة تتطلب موافقة.", { id: name });
  }

  const keywordsPath = path.join(pkgDir, "keywords.json");
  const rawKeywords = fs.existsSync(keywordsPath)
    ? JSON.parse(fs.readFileSync(keywordsPath, "utf8"))
    : {};

  const vocabPath = path.join(pkgDir, "vocabulary.json");
  const vocabulary = fs.existsSync(vocabPath)
    ? JSON.parse(fs.readFileSync(vocabPath, "utf8"))
    : {};

  return {
    id: name,
    manifest,
    keywords: stripMetadata(rawKeywords),
    vocabulary: stripMetadata(vocabulary),
  };
}

export default { loadDialect, assertSafeDialectName };
