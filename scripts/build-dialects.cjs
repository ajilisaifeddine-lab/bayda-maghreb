// يولّد apps/web-lab/examples.ts: أمثلة صغيرة مدمجة دائماً في المختبر (للعرض والتجربة بلا اتصال).
// كلمات كل مثال وقاموسه تُستخرج من packages/ ولا تُكتب يدوياً.
// التشغيل: npm run dialects
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const PACKAGES = path.join(ROOT, "packages");
const OUT = path.join(ROOT, "apps/web-lab/examples.ts");
const SAFE_ID = /^[a-z0-9][a-z0-9-]*$/i;
const VOCAB_SAMPLE = 8;
const REQUIRED_CONCEPTS = ["print", "if", "true"];

const SAMPLES = {
  "tn-latn": 'goul("Aslema")\nidha (s7i7) {\n    goul("Marhba bik")\n}',
  "tn-arab": 'قول("عسلامة")\nإذا (صحيح) {\n    قول("مرحبا بيكم")\n}',
  "dz-latn": 'ktab("Salam")\nila (sah) {\n    ktab("Marhba")\n}',
  "ly-latn": 'kteb("Salam")\nkan (sahih) {\n    kteb("Marhba")\n}',
  "mr-latn": 'ktab("Salam")\nidha (haqq) {\n    ktab("Marhba")\n}',
  "kab-latn": 'aru("Azul")\nma (tidett) {\n    aru("Ansuf")\n}',
  "shi-latn": 'skr("Azul")\nma (tidtt) {\n    skr("Marhba")\n}',
  "kab-tifinagh": 'ⴽⵜⴰⴱ("ⴰⵣⵓⵍ")\nⵎⴰ (ⵀⴰⵇⵇ) {\n    ⴽⵜⴰⴱ("ⴰⵏⵙⵓⴼ")\n}',
  "ma-latn": 'goul("Salam")\nila (s7i7) {\n    goul("Marhba")\n}',
  "ma-arab": 'قول("سلام")\nإلى (بصح) {\n    قول("مرحبا بكم")\n}',
  "dz-arab": 'كتب("سلام")\nايلا (صح) {\n    كتب("مرحبا")\n}',
  "ly-arab": 'كتب("سلام")\nكان (صحيح) {\n    كتب("مرحبا")\n}',
  "mr-arab": 'كتب("سلام")\nإذا (حق) {\n    كتب("مرحبا")\n}',
};

const HEADER = [
  "// أمثلة مدمجة دائماً في المختبر (تعمل بلا اتصال) — للعرض والتجربة فقط.",
  "// مُولَّد بـ scripts/build-dialects.cjs (npm run dialects) من packages/ — لا تعدّله يدوياً.",
  "// الحزم الكاملة تُنزَّل من النواة بطلب المستخدم ولا تُدمج هنا.",
  "",
  "export interface DialectExample {",
  "  sample: string;",
  "  keywords: Record<string, string>;",
  "  vocabulary: Record<string, string>;",
  "}",
  "",
  "export const examples: Record<string, DialectExample> = ",
].join("\n");

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function onlyStrings(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === "string") out[k] = v;
  }
  return out;
}

function buildExamples() {
  const dirs = fs
    .readdirSync(PACKAGES)
    .filter((d) => fs.statSync(path.join(PACKAGES, d)).isDirectory() && fs.existsSync(path.join(PACKAGES, d, "manifest.json")))
    .sort();
  const missing = dirs.filter((d) => !Object.hasOwn(SAMPLES, d));
  const extra = Object.keys(SAMPLES).filter((d) => !dirs.includes(d));
  if (missing.length || extra.length) {
    throw new Error("لا تطابق بين اللهجات والأمثلة. ناقص مثال: [" + missing + "] | مثال بلا حزمة: [" + extra + "]");
  }
  const out = {};
  for (const id of dirs) {
    if (!SAFE_ID.test(id)) throw new Error("اسم مجلد لهجة غير آمن: " + id);
    const kw = onlyStrings(readJson(path.join(PACKAGES, id, "keywords.json")));
    const vo = onlyStrings(readJson(path.join(PACKAGES, id, "vocabulary.json")));
    const words = SAMPLES[id].replace(/"[^"]*"/g, "").match(/[\p{L}\p{M}\p{N}]+/gu) || [];
    const used = {};
    for (const w of words) {
      if (Object.hasOwn(kw, w) && !Object.hasOwn(used, w)) used[w] = kw[w];
    }
    for (const c of REQUIRED_CONCEPTS) {
      if (!Object.values(used).includes(c)) throw new Error(id + ": المثال لا يستعمل المفهوم " + c);
    }
    out[id] = {
      sample: SAMPLES[id],
      keywords: used,
      vocabulary: Object.fromEntries(Object.entries(vo).slice(0, VOCAB_SAMPLE)),
    };
  }
  return out;
}

function render(examples) {
  return HEADER + JSON.stringify(examples, null, 2) + ";\n";
}

module.exports = { buildExamples, render };

if (require.main === module) {
  try {
    fs.writeFileSync(OUT, render(buildExamples()), "utf8");
    console.log("تم: " + path.relative(ROOT, OUT));
  } catch (e) {
    console.error("خطأ:", e.message);
    process.exit(1);
  }
}
