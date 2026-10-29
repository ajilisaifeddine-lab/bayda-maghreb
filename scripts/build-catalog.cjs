// يولّد packages/catalog.json: بصمة sha256 وحجم كل ملف json في كل لهجة.
// التشغيل: npm run catalog  (قبل كل إصدار، بعد رفع رقم الإصدار في package.json).
// البصمة تُحسب على بايتات الملف كما هي.
"use strict";
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.join(__dirname, "..");
const PACKAGES = path.join(ROOT, "packages");
const OUT = path.join(PACKAGES, "catalog.json");
const SAFE_ID = /^[a-z0-9][a-z0-9-]*$/i;
const SAFE_FILE = /^[a-z0-9][a-z0-9._-]*\.json$/i;
const SEMVER = /^\d+\.\d+\.\d+$/;
const REQUIRED = ["manifest.json", "keywords.json", "vocabulary.json"];

function sha256(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function buildCatalog() {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
  if (!SEMVER.test(String(pkg.version))) throw new Error("رقم إصدار package.json غير صالح");
  const ids = fs
    .readdirSync(PACKAGES)
    .filter((d) => fs.statSync(path.join(PACKAGES, d)).isDirectory())
    .sort();
  const dialects = {};
  for (const id of ids) {
    if (!SAFE_ID.test(id)) throw new Error("اسم مجلد لهجة غير آمن: " + id);
    const dir = path.join(PACKAGES, id);
    const manifestPath = path.join(dir, "manifest.json");
    if (!fs.existsSync(manifestPath)) throw new Error(id + ": manifest.json ناقص");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    if (!SEMVER.test(String(manifest.version))) throw new Error(id + ": رقم إصدار manifest غير صالح");
    const files = {};
    for (const f of fs.readdirSync(dir).filter((n) => n.endsWith(".json")).sort()) {
      if (!SAFE_FILE.test(f)) throw new Error(id + ": اسم ملف غير آمن: " + f);
      const buf = fs.readFileSync(path.join(dir, f));
      files[f] = { sha256: sha256(buf), bytes: buf.length };
    }
    for (const need of REQUIRED) {
      if (!files[need]) throw new Error(id + ": ملف ناقص: " + need);
    }
    dialects[id] = { version: manifest.version, files };
  }
  return { schema: 1, release: "v" + pkg.version, dialects };
}

function render(catalog) {
  return JSON.stringify(catalog, null, 2) + "\n";
}

module.exports = { buildCatalog, render };

if (require.main === module) {
  try {
    fs.writeFileSync(OUT, render(buildCatalog()));
    console.log("تم: " + path.relative(ROOT, OUT));
  } catch (e) {
    console.error("خطأ:", e.message);
    process.exit(1);
  }
}
