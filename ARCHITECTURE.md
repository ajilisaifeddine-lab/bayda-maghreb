# Architecture — Bayda Maghreb

## Core Pipeline (المسار الأساسي)

```
packages/*.json → loader → lexer → normalizer → program.ts → writers
        ↑_____________________ translate() _____________________↑
        ← المستهلكون: المختبر (apps/web-lab) / bayda (CLI) / المكتبة (index.ts)
```

كل الترجمة تمرّ عبر **`translate()`** — الرابط المركزي.

### المراحل

| المرحلة | الملف | الوظيفة |
| :--- | :--- | :--- |
| **packages** | `packages/<dialect>/{manifest,keywords,vocabulary}.json` | بيانات اللهجة: كلمة → مفهوم قياسي |
| **loader** | `core/loader.ts` | يحمّل الحزمة، يفرض `requiresConsent`، ويجرّد البيانات الوصفية |
| **lexer** | `core/lexer.ts` | تحليل لغوي؛ يتعامل مع أرقام الفرانكو (`9oul`, `3lik`) كحروف |
| **normalizer** | `core/normalizer.ts` | يحوّل كلمات اللهجة إلى مفاهيم قياسية (مدفوع بالخريطة، يدعم العبارات المركّبة) |
| **program** | `core/program.ts` | يبني شجرة البرنامج (Call / If / While) |
| **writers** | `writers/{js,python}-writer.ts` | يولّد JavaScript / Python (يدعم `else if` / `elif`) |

### الرابط المركزي

- **`core/translate.ts`** — نواة خالصة (تعمل في Node والمتصفح):
  `translate(source, { keywords, id, target })` → `{ code, target, tokens, ast }`.
- **`core/translate-node.ts`** — غلاف Node: يحمّل الحزمة من القرص ثم يفوّض إلى `translate()`:
  `translateDialect(source, { dialect, target, consent })`.
- **`core/registry.ts`** — مصدر الحقيقة الواحد للمستهلكين: `listDialects()`، `getDialectInfo(id)`،
  `getKeywords(id)` (تقرأ من `packages/` عبر `loader`).
- **`core/errors.ts`** — نظام أخطاء موحّد: `BaydaError` بكود ثابت (`[CODE] رسالة`).

## Extensibility (التوسعة)

- **لهجة جديدة = JSON فقط:** أضف مجلداً في `packages/` فيه `manifest.json` و`keywords.json`.
- **هدف جديد = writer فقط:** أضف `writers/<lang>-writer.ts` يستقبل شجرة `program.ts`.

## Consumers (المستهلكون)

- **المختبر** `apps/web-lab/`: **رفيع**. يستورد `translate()` من النواة. يحمل **ملف أمثلة صغيراً مُضمّناً دائماً** من كل لهجة (للعرض والتجربة فقط) ويعمل بلا اتصال. ولا يتصل بالنواة إلا عندما يؤكّد المستخدم تنزيل لهجة (انظر Dialect Download). لا نسخة مكرّرة من `packages/`، ولا منطق لغوي داخله.
- **CLI** `bayda-bin`: يقرأ ملف `.bayda`، يحمّل اللهجة، ثم `translateDialect()` ويطبع/ينفّذ الناتج.
- **المكتبة** `index.ts` (تُبنى إلى `dist/` عبر `tsc`).

## Dialect Download (تنزيل الحزم)

- **متى:** فقط عندما يختار المستخدم لهجة ويؤكّد التنزيل. لا اتصال قبل ذلك.
- **المصدر:** النواة (إصدار ثابت على GitHub). الشكل التفصيلي للملف المفهرس والمصدر قيد التصميم.
- **التحقق:** بصمة sha256 لكل ملف، ثم `validateDialectPack` في `core/pack.ts` (آمن للمتصفح وبلا مكتبات: حدود الحجم، ورفض المفاتيح الخطرة `__proto__` و`constructor` و`prototype`)، قبل الحفظ وعند كل قراءة.
- **التخزين:** في جهاز المستخدم فقط (IndexedDB). **لا يُرفع أي ملف من جهاز المستخدم أبداً.**
- **التحديث:** إشعار بوجود إصدار أحدث. فإن وافق المستخدم نُزّلت الحزمة وفُحصت، ثم استبدلها التطبيق بالقديمة محلياً مع إشعار بحذف القديمة. وإن رفض بقيت القديمة.

## Lessons (الدروس)

- **`core/lessons.json`**: دروس بثلاثة أوضاع (`kid` / `beginner` / `pro`) بالعربية فقط. لكل درس معرّف ثابت وترتيب وشرح وتلميحات وقالب كود بخانات مفاهيم (`{{print}}`) وقواعد فحص بنيوي وحقل `requires`.
- **`core/lessons.ts`**: نقي (بلا DOM ولا شبكة ولا eval ولا استيراد). يفحص الملف بقائمة بيضاء (`validateLessons`، ويرفض الروابط ووسوم HTML والمفاتيح الخطرة)، ويملأ الخانات بكلمات حزمة اللهجة (`fillConcepts`)، ويعرض الدروس التي تغطيها مفاهيم اللهجة (`lessonsFor`) وما ينتظر منها (`lockedFor`)، ويفحص شجرة `translate()` بقواعد الدرس (`evaluateRules`).
- **الفتح التلقائي:** الدرس الناجز يظهر لكل لهجة تغطي مفاهيمه دون تغيير في الكود. الدروس `planned` هياكل بلا نص (المتغيرات والعدّاد والحلقة `for` والدوال والمصفوفات والأخطاء)، تُكتب بعد أن تغطي الحزم مفاهيمها.
- **التحقق بنيوي فقط:** لا يُنفَّذ أي كود، فلا يمكن فحص «الناتج يساوي كذا». نتيجة الفحص رمز ثابت (`op` لأول قاعدة فشلت) ليربطه المستهلك برسالة مترجمة.
- **المستهلك:** المختبر `apps/web-lab` لم يُربط بالدروس بعد؛ المخطَّط نسخة مصغّرة منها للعرض فقط تُولَّد كما يُولَّد `examples.ts`، والدروس الكاملة تبقى في النواة.
- **الاختبار:** `tests/core/lessons.test.ts` يمرّ على كل لهجة في `packages/`؛ الحل المرجعي لكل درس يُترجم إلى js وpy ويجتاز فحصه، والمثال الخاطئ يفشل.

## AI Hook

- `core/normalizer.ts` — نقطة الوصل الذكية (تطبيع اللهجات والعبارات المركّبة).

## Scripts

- `scripts/audit.cjs` — فحص صحّة حِزم اللهجات.
- `scripts/build-dialects.cjs` — توليد `apps/web-lab/examples.ts` (الأمثلة المدمجة فقط، من `packages/`). الملفان القديمان `dialects.ts` و`vocabularies.ts` حُذفا ويبقيان في تاريخ git فقط.
- `scripts/migrate-reviewstatus.cjs` — نقل `reviewStatus` من keywords إلى manifest.
