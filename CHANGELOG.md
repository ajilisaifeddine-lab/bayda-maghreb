# Changelog

## 2.1.2 - 2026-10-21

### Fixed
- **البناء**: `tsc` لا يحذف مخرجات المصادر المحذوفة، فبقيت خمسة ملفات مترجمة بلا مصدر تُنشر فعليًا في الحزمة: `dist/core/{ast,compile,mapping,parser,transliterator}.js` مع ملفات `.d.ts` — أي 10 ملفات / 40 KB كود ميت بلا مرجع. أُضيف سكربت `clean` (يحذف `dist/`) ويُستدعى قبل `tsc` في كل بناء.
- **`package.json`**: فصل `build` (النواة فقط — ما يُنشر) عن `build:all` (النواة + المختبر)، لأن المختبر ليس داخل الحزمة، فلا يجوز أن يعطّل النشر.

### Added
- **`scripts/check-lab-build.cjs`** + `npm run lab:check`: يبني `main.ts` إلى الذاكرة ويقارنه بـ `main.js` بايتًا ببايت، ويفشل بكود 1 برسالة واضحة إن كان قديمًا. يمنع الانحراف الصامت بين المصدر والناتج.
- **`.gitignore`**: `apps/web-lab/main.js` لم يعد مسجَّلًا — مصدر واحد للحقيقة هو `main.ts`.

### Verified (قبل النشر، على الحزمة المُعبَّأة لا على المصدر)
- `npm pack` ثم `npm i bayda-maghreb-2.1.2.tgz` في مجلد نظيف.
- **77 ملفًا، 49.8 kB** (كانت 87 ملفًا / 52.6 kB)، وصفر ملفات ميتة في `dist/`.
- 6 مسارات CLI: JS، `--to py`، `--run`، `--dialect`، اسم ملف ثلاثي، `-o`.
- **18/18** فحص API، و**7/7** لهجات إلى JS وPython.
- الأمان: `../etc/passwd` → `INVALID_DIALECT_NAME`، لهجة مجهولة → `UNKNOWN_DIALECT`، مصدر > 1 MB → `SOURCE_TOO_LARGE`.
- 87/87 اختبار وحدة.

## 2.1.1 - 2026-10-21

### Fixed
- **CLI `bayda-bin`**: كان يستخرج اللهجة من اسم الملف بـ `split(".")[1]`، فملف مثل `t.bayda` كان يعطي اللهجة `"bayda"` وينهار بـ `UNKNOWN_DIALECT`. الآن يُستخرج الجزء الأوسط فقط عند وجود ثلاثة مقاطع أو أكثر (`hello.tn-latn.bayda`)، وإلا يعود إلى `tn-latn`.
- **CLI `bayda-bin`**: إضافة دعم `--to js|py` إلى جانب `--py`، وتحديث رسالة الاستخدام.
- **`packages/tn-latn`**: إضافة الصيغ الشائعة `ktab`, `kteb`, `ktib`, `haqq`, `sahih`, `sa7i7`, `s7ih`, `wela` — مثال README (`ktab`/`haqq`) كان لا يعمل سابقًا.
- **`packages/dz-latn`, `ly-latn`, `mr-latn`**: إثراء القواميس (كانت 5 كلمات فقط) بالصيغ المتقاطعة الشائعة، مع الحفاظ على الكلمات الأصلية لكل لهجة.

### Verified
- 87/87 اختبار ناجح، و`tsc` نظيف، و`npm pack` بلا تحذيرات (87 ملفًا، 52.6 kB).
- اختبار الحزمة المنشورة فعليًا من السجل: `npm i bayda-maghreb@2.1.0` ثم CLI على `tn`/`dz`/`ly`/`mr` و`--to py` و`--run`.

## 2.1.0 - 2026-10-21

### Added
- `core/translate.ts`: الرابط المركزي للمسار الكامل (نواة خالصة تعمل في Node والمتصفح).
- `core/translate-node.ts`: غلاف Node يحمّل الحزمة من القرص ثم يفوّض إلى `translate()`.
- `index.ts`: نقطة دخول المكتبة (translate, loadDialect, writers, detector...).
- `tests/core/translate.test.ts`: ترجمة end-to-end لكل اللهجات السبعة (JS + Python).
- `tests/core/concepts.test.ts`: تحقق أن كل كلمة لهجة تشير إلى مفهوم في `core/concepts.json`.
- `scripts/migrate-reviewstatus.cjs`، وسكربتات `build` و`lab:build`.
- `core/registry.ts`: مصدر الحقيقة الواحد للمستهلكين (`listDialects`، `getDialectInfo`، `getKeywords`).
- `core/errors.ts`: نظام أخطاء موحّد `BaydaError` بكود ثابت (`[CODE] رسالة`) وحد حجم المصدر (`MAX_SOURCE_BYTES`).
- `tests/core/loader.security.test.ts` و`tests/core/registry.test.ts`: تحصين path traversal والمدخلات.
- حزمة npm كاملة: `bin` (`bayda`)، `main`/`module`/`types`/`exports`/`files`، وتوليد ملفات `.d.ts`.

### Fixed
- **normalizer**: كان يتجاهل خريطة كلمات اللهجة ويستخدم قائمة تونسية صلبة؛ الآن مدفوع بالخريطة ويدعم العبارات المركّبة (`idha ken` → `else if`) دون مطابقة عبر الأسطر.
- **lexer**: أرقام الفرانكو (`9oul`, `3lik`, `5ayb`) تُعامل الآن كحروف لا كأرقام (كما يدّعي README).
- **writers**: يترجمون الاسم إن كان كلمة لهجة أو مفهوماً قياسياً، ويدعمون سلاسل `else if` / `elif`.
- **loader**: يحلّ مسار `packages/` نسبةً للوحدة (لا `cwd` فقط) ويجرّد البيانات الوصفية.
- **targets**: لم يعد يستبدل بالـ regex الصلب؛ يمرّ عبر lexer → normalizer → program → writers.
- **CLI `bayda-bin`**: يقرأ الملف ويترجم فعلياً (`--py`, `--run`, `-o`) بدل طباعة سطر فقط.
- **المكتبة**: حُذف `src/index.js` القديم (كان يستورد `./dialect-registry.js` غير الموجود)؛ الواجهة الآن `index.ts` فقط.
- **المختبر `main.ts`**: يستخدم `translate()` الآن.
- اختبار معطوب: `lexer.dialects.test.ts` (مسار خاطئ) أُصلح.

### Changed
- `reviewStatus` انتقل من `keywords.json` إلى `manifest.json` (بيانات وصفية لا كلمات برمجية).
- **المختبر رفيع**: بيانات اللهجات مُضمّنة وقت البناء من الجذر (`scripts/build-dialects.cjs` → `dialects.ts`/`vocabularies.ts`)، لا `fetch` وقت التشغيل ولا نسخة مكرّرة من `packages/`.
- **loader**: تحصين الاسم (`SAFE_NAME`) و`assertInsideRoot` ضد path traversal، وتحقّق zod تحذيري.
- النتيجة: **87/87 اختبار ناجح** (كان 29/30).

### Removed
- `bayda-bi`: كان مكسوراً (يستورد `./src/dialect-registry.js` غير الموجود) ومكرّراً لـ `bayda-bin`.
- `scripts/sync-packages.cjs`: لم يعد لازماً (لا نسخ مكرّر للمختبر).
- `audit_packages.cjs` (الجذر): نسخة قديمة مكرّرة من `scripts/audit.cjs`.
- ملفات المسار القديم الميتة/المكرّرة (مسار واحد فقط الآن): `core/ast.ts`، `core/mapping.ts`، `core/compile.ts`، `core/parser.ts` (استُبدل بـ `program.ts`)، `core/transliterator.ts` (تكرار `detectScript`)، `src/index.js` (شيم قديم)، `index.htm` (صفحة هبوط قديمة)، `apps/web-lab/meta.json` (أثر بناء قديم).

## 1.4.0 - 2026-10-16

### Added
- `core/concepts.json`: the list of JavaScript words that a dialect's `keywords` may map to. A test checks every dialect against it.

### Fixed
- Transpiler: a repeated `let` is now turned into an assignment only inside the same block. Before, the same variable name in two functions caused a ReferenceError.
- Transpiler: text inside backticks (template strings) is no longer changed.

### Removed
- Words that are not JavaScript moved from `keywords` to `vocabulary`, so they no longer change the generated code: Algerian (56), Algerian Franco (64), Kabyle Latin (37), Kabyle (23), Libyan (235), Mauritanian (173, they were already copied to `vocabulary`).

## 1.3.0 - 2026-10-15

### Added
- Libyan: `لو لا` (and `لولا`) now mean `else if`.
- Kabyle: `azul` now maps to `console.log`.
- Mauritanian: new `vocabulary` section (English terms for reading and learning, not used in code).
- Dialect files now follow a schema, checked by the tests.

### Changed
- `elif` is now written as `else if` in the generated JavaScript (Algerian and Libyan dialects).
- Libyan: `لو` now means `if` (it was `elif`).

### Removed
- `and`, `or`, `not` and `end` no longer map to code in the Algerian, Libyan and Kabyle Latin dialects. They never produced valid JavaScript and now live in `vocabulary`.

## 1.2.1 - 2026-10-15

### Changed
- package.json: `engines` now needs Node >=20. Description and keywords updated.
- CI now tests on Node 20, 22 and 24.
- Added a test that runs `bayda` and `bayda-repl` from another directory.
- Added changelog entries for 1.1.21 and 1.1.22.

## 1.2.0 - 2026-10-15

### Added
- Tunisian Franco dictionary expanded from 33 to 148 words: many more spellings for if, else, while, for, break, continue, return, function, import and export.
- Compound words work with or without a space (`idha ken` / `idhaken`, `7ata lin` / `7atalin`).
- New words: `khalli`, `itba3`, `sinon`, `diz` / `dezz` / `dizz` (push), `zeed` / `ziid` (add).

### Changed
- `zid` now means `add` (it was `+`).

### Removed
- `na9es`, `zawzi`, `zwzi`, `fardi`, `frdi`: symbols stay symbols, so write `-`, `% 2 == 0` and `% 2 != 0` directly.

## 1.1.22 - 2026-10-14

### Changed
- No code changes (version bump only).

## 1.1.21 - 2026-10-14

### Fixed
- `bayda-repl` now finds its dictionary relative to the package, so it runs from any directory (it failed with ENOENT outside the repo).

## 1.1.20 - 2026-10-14

### Changed
- Removed old reversed dialects/mauritania.json (all 176 words are already in data/dialects/mauritania.json).
- Moved lahjat vocabulary notes to docs/vocabulary (no longer published to npm).
- README: replaced broken links with a dialect table that links to the real dictionaries.

## 1.1.19 - 2026-10-14

### Changed
- audit.cjs moved to scripts/.
- mauritania test moved to tests/; the test runner now also finds .js tests in tests/ (6 more tests run).
- Removed stale test.mjs.

## 1.1.18 - 2026-10-14

### Fixed
- Transpiler no longer adds double parentheses around conditions: if (true) stays if (true).
- Transpiler output is trimmed (no leading space).
- tunisia_franco.json now follows the standard dialect schema (code, name, script, keywords), so the audit check passes.
- CLI test now uses real Tunisian Franco words (ken, goul, wella).

### Added
- Tunisian Franco REPL (toulma + goul fixed).
- Franco dialect data (Tunisian and Algerian).
- CONTRIBUTING guide, CODEOWNERS, branch protection and the Check Dialect audit.
- README: Install, Quick start, license badge and Franco dialect codes (tn-latn, dz-latn).

### Changed
- Images moved to docs/.
- Removed test leftover files; out.js and test-*.bayda are now ignored.

## 1.1.17
- Release 1.1.17.
