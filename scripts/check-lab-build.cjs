#!/usr/bin/env node
/**
 * check-lab-build.cjs — حارس ضد البناء القديم للمختبر.
 *
 * يبني apps/web-lab/main.ts إلى ذاكرة (بلا كتابة) ويقارنه بـ apps/web-lab/main.js.
 * إن اختلفا، يفشل بكود 1 ويطلب تشغيل `npm run lab:build`.
 *
 * السبب: main.js لم يعد مسجَّلًا في git (مصدر واحد = main.ts)، لذا يجب
 * التأكد قبل النشر أن ما سيُقدَّم للمستخدم هو ناتج المصدر الحالي فعلًا.
 */
const fs = require("fs");
const path = require("path");
const esbuild = require("esbuild");

const ROOT = path.resolve(__dirname, "..");
const ENTRY = path.join(ROOT, "apps/web-lab/main.ts");
const OUTPUT = path.join(ROOT, "apps/web-lab/main.js");

function fail(msg) {
  console.error(`\n\u274c ${msg}\n`);
  process.exit(1);
}

async function main() {
  if (!fs.existsSync(ENTRY)) fail(`missing source: ${path.relative(ROOT, ENTRY)}`);

  const result = await esbuild.build({
    entryPoints: [ENTRY],
    bundle: true,
    format: "esm",
    platform: "browser",
    write: false,
    logLevel: "silent",
  });

  const fresh = result.outputFiles[0].text;

  if (!fs.existsSync(OUTPUT)) {
    fail(
      `apps/web-lab/main.js is missing.\n` +
        `   Run: npm run lab:build`
    );
  }

  const current = fs.readFileSync(OUTPUT, "utf8");

  if (current !== fresh) {
    const curLines = current.split("\n").length;
    const newLines = fresh.split("\n").length;
    fail(
      `apps/web-lab/main.js is STALE (out of date with main.ts).\n` +
        `   on disk: ${curLines} lines / ${current.length} bytes\n` +
        `   source : ${newLines} lines / ${fresh.length} bytes\n` +
        `   Run: npm run lab:build`
    );
  }

  console.log(`\u2705 apps/web-lab/main.js is up to date (${fresh.length} bytes)`);
}

main().catch((e) => fail(e && e.message ? e.message : String(e)));
