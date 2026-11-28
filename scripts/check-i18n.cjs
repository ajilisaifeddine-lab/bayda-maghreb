/* SPDX-License-Identifier: AGPL-3.0-or-later
 * فحص اكتمال الترجمة في apps/web-lab (للقراءة فقط، لا يعدّل شيئًا).
 * الاستعمال: node scripts/check-i18n.cjs
 */
"use strict";
const fs = require("fs");
const path = require("path");

const DIR = path.join(__dirname, "..", "apps", "web-lab");
const LANGS = ["ar", "fr", "en", "es", "it", "de", "nl"];
const SKIP = new Set(["i18n.js", "engine.bundle.js"]);
const AR = /[\u0600-\u06FF]/;

function read(f) { return fs.readFileSync(path.join(DIR, f), "utf8"); }

/* 1) مفاتيح كل لغة من القاموس */
const dict = read("i18n.js");
const starts = [];
const re = /^ {4}(ar|fr|en|es|it|de|nl): \{$/gm;
let m;
while ((m = re.exec(dict))) starts.push({ lang: m[1], at: m.index });
const keys = {};
starts.forEach((s, i) => {
  let end = i + 1 < starts.length ? starts[i + 1].at : dict.length;
  const close = dict.indexOf("\n    },", s.at);
  if (close !== -1 && close < end) end = close;
  const set = new Set();
  const kr = /(?:^|,)\s*([A-Za-z_][A-Za-z0-9_]*):\s*["'`]/gm;
  const blk = dict.slice(s.at, end);
  let k;
  while ((k = kr.exec(blk))) set.add(k[1]);
  keys[s.lang] = set;
});
const base = keys.ar || new Set();
let problems = 0;

console.log("مفاتيح العربية:", base.size);
LANGS.slice(1).forEach((l) => {
  const miss = [...base].filter((k) => !keys[l] || !keys[l].has(k));
  const extra = [...(keys[l] || [])].filter((k) => !base.has(k));
  if (miss.length || extra.length) problems++;
  console.log(l, "| ناقص:", miss.length, miss.slice(0, 8).join(","), "| زائد:", extra.length, extra.slice(0, 4).join(","));
});

/* 2) مفاتيح مستعملة في الكود */
const files = fs.readdirSync(DIR).filter((f) => /\.(js|html)$/.test(f) && !SKIP.has(f));
const used = new Map();
const call = /\b(?:tr|sT|uT|nT|dT|kT|kmT|rbT|errT|tx|t)\(\s*["']([A-Za-z0-9_]+)["']/g;
const attr = /data-i18n-(?:key|title|placeholder|aria)="([A-Za-z0-9_]+)"/g;
files.forEach((f) => {
  const t = read(f);
  [call, attr].forEach((r) => { r.lastIndex = 0; let x; while ((x = r.exec(t))) { if (!used.has(x[1])) used.set(x[1], f); } });
});
const unknown = [...used.keys()].filter((k) => !base.has(k) && !/^(dlName_|dlScript_|dlCountry_|bsDay|dl_|sc_|kmTheme_)$/.test(k));
if (unknown.length) problems++;
console.log("مفاتيح مستعملة:", used.size, "| غير موجودة في القاموس:", unknown.length, unknown.slice(0, 10).map((k) => k + "@" + used.get(k)).join(" "));

/* 3) نصوص عربية ظاهرة غير مربوطة (تقريبي) */
const sink = /(textContent|innerHTML|placeholder|aria-label|title|toast|say)\b/;
const bound = /\b(?:tr|sT|uT|nT|dT|kT|rbT|errT|tx|t)\(|data-i18n-|dlName_|dlScript_|dlCountry_|bsDay/;
let loose = 0;
files.forEach((f) => {
  read(f).split("\n").forEach((line, i) => {
    const t = line.trim();
    if (!AR.test(t) || /^(\/\/|\/\*|\*)/.test(t) || bound.test(t) || !sink.test(t)) return;
    loose++;
    if (loose <= 25) console.log("  غير مربوط", f + ":" + (i + 1), t.slice(0, 90));
  });
});
console.log("نصوص عربية غير مربوطة (تقريبًا):", loose);
if (loose) problems++;
console.log(problems ? "النتيجة: توجد ملاحظات" : "النتيجة: لا ملاحظات");
process.exit(0);
