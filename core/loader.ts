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

  const pkgDir = path.join(process.cwd(), "packages", name);
  const manifestPath = path.join(pkgDir, "manifest.json");

  if (!fs.existsSync(manifestPath)) {
    return null;
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

  if (manifest.requiresConsent && !consent) {
    throw new Error("CONSENT_REQUIRED: Dialect requires consent.");
  }

  const keywordsPath = path.join(pkgDir, "keywords.json");
  const keywords = fs.existsSync(keywordsPath)
    ? JSON.parse(fs.readFileSync(keywordsPath, "utf8"))
    : {};


  const vocabPath = path.join(pkgDir, "vocabulary.json");
  const vocabulary = fs.existsSync(vocabPath)
    ? JSON.parse(fs.readFileSync(vocabPath, "utf8"))
    : {};

  return { id: name, manifest, keywords, vocabulary };
}
