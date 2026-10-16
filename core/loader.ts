import fs from "fs";
import path from "path";

export interface DialectPackage {
  id: string;
  manifest: any;
  keywords: Record<string, any>;
  vocabulary: any;
}

export function loadDialect(name: string, options: { consent?: boolean } = {}): DialectPackage | null {
  const consent = options.consent ?? false;

  // 1. جرب الحزمة الجديدة packages/tounsi/
  const pkgDir = path.join(process.cwd(), "packages", name);
  const manifestPath = path.join(pkgDir, "manifest.json");

  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    
    // تطبيق رؤيتك: موافقة إجبارية
    if (manifest.requiresConsent && !consent) {
      throw new Error(`CONSENT_REQUIRED: حزمة ${name} تتطلب موافقة المستخدم قبل التنزيل`);
    }

    const keywordsPath = path.join(pkgDir, "keywords.json");
    const vocabPath = path.join(pkgDir, "vocabulary.json");

    const keywords = fs.existsSync(keywordsPath) 
      ? JSON.parse(fs.readFileSync(keywordsPath, "utf-8")) 
      : {};
    const vocabulary = fs.existsSync(vocabPath)
      ? JSON.parse(fs.readFileSync(vocabPath, "utf-8"))
      : {};

    return { id: name, manifest, keywords, vocabulary };
  }

  // 2. fallback للقديم data/dialects/${name}.json للتوافق
  const oldPath = path.join(process.cwd(), "data", "dialects", `${name}.json`);
  if (fs.existsSync(oldPath)) {
    const data = JSON.parse(fs.readFileSync(oldPath, "utf-8"));
    return { id: name, manifest: { id: name, requiresConsent: false }, keywords: data, vocabulary: {} };
  }

  return null;
}
