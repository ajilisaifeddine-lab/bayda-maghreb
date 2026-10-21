/**
 * سجل اللهجات — مصدر الحقيقة الواحد للمستهلكين (المختبر / CLI / المكتبة).
 *
 * المبدأ: النواة هي الأصل. المستهلكون يتصلون بهذه الواجهة عندما يريدون معلومات،
 * ولا ينسخون الحِزَم بأنفسهم.
 *
 *   packages/*.json  →  loader  →  registry  →  المستهلكون
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { loadDialect, DialectPackage } from "./loader.js";
import { BaydaError } from "./errors.js";

export interface DialectInfo {
  /** معرّف اللهجة (اسم المجلد)، مثل "tn-latn". */
  id: string;
  /** الاسم المقروء من manifest. */
  name: string;
  /** النص (latn / arab / tifinagh ...). */
  script: string;
  /** عدد الكلمات المفتاحية. */
  keywordCount: number;
  /** عدد مفردات القاموس. */
  vocabularyCount: number;
  /** هل تتطلب موافقة؟ */
  requiresConsent: boolean;
  /** الـ manifest كاملاً (بيانات وصفية). */
  manifest: Record<string, unknown>;
}

export interface RegistryOptions {
  /** مجلد الحِزَم (افتراضياً يُكتشف تلقائياً). */
  packagesDir?: string;
  /** الموافقة على اللهجات التي تتطلبها. */
  consent?: boolean;
}

/** يبحث عن جذر الحِزَم (نفس منطق loader). */
function findPackagesRoot(): string | null {
  const candidates: string[] = [];
  try {
    const here = path.dirname(fileURLToPath(import.meta.url));
    candidates.push(path.resolve(here, "..", "packages"));
    candidates.push(path.resolve(here, "..", "..", "packages"));
  } catch {
    /* import.meta.url غير متاح */
  }
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

/** يرمي UNKNOWN_DIALECT إن لم يُعثر على الحِزَم. */
function requireRoot(options: RegistryOptions): string {
  const root = options.packagesDir || findPackagesRoot();
  if (!root) {
    throw new BaydaError("UNKNOWN_DIALECT", "لم يُعثر على مجلد الحِزَم (packages/).");
  }
  return root;
}

/**
 * يسرد كل اللهجات المتاحة (مصدر واحد).
 * @example listDialects().map(d => d.id) // ["dz-latn", "kab-latn", ...]
 */
export function listDialects(options: RegistryOptions = {}): DialectInfo[] {
  const root = requireRoot(options);
  const out: DialectInfo[] = [];

  for (const entry of fs.readdirSync(root)) {
    const dir = path.join(root, entry);
    let isDir = false;
    try {
      isDir = fs.statSync(dir).isDirectory();
    } catch {
      continue;
    }
    if (!isDir) continue;

    const manifestPath = path.join(dir, "manifest.json");
    if (!fs.existsSync(manifestPath)) continue;

    let manifest: Record<string, any> = {};
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    } catch {
      continue;
    }

    const kwPath = path.join(dir, "keywords.json");
    const vocabPath = path.join(dir, "vocabulary.json");
    const count = (p: string) => {
      try {
        return fs.existsSync(p) ? Object.keys(JSON.parse(fs.readFileSync(p, "utf8"))).length : 0;
      } catch {
        return 0;
      }
    };

    out.push({
      id: entry,
      name: manifest.name ?? entry,
      script: manifest.script ?? "latn",
      keywordCount: count(kwPath),
      vocabularyCount: count(vocabPath),
      requiresConsent: !!manifest.requiresConsent,
      manifest,
    });
  }

  // ترتيب ثابت حسب المعرّف
  out.sort((a, b) => a.id.localeCompare(b.id));
  return out;
}

/**
 * يعيد معلومات لهجة واحدة (مع حِزمتها الكاملة) عبر loader.
 * يرمي UNKNOWN_DIALECT إن لم توجد.
 */
export function getDialectInfo(id: string, options: RegistryOptions = {}): DialectPackage {
  const pkg = loadDialect(id, {
    consent: options.consent ?? true,
    packagesDir: options.packagesDir,
  });
  if (!pkg) {
    throw new BaydaError("UNKNOWN_DIALECT", `لهجة غير معروفة: ${id}`, { id });
  }
  return pkg;
}

/** يعيد الكلمات المفتاحية فقط (اختصار شائع للمستهلكين). */
export function getKeywords(id: string, options: RegistryOptions = {}): Record<string, string> {
  return getDialectInfo(id, options).keywords;
}

export default { listDialects, getDialectInfo, getKeywords };
