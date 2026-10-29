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
- **التحقق:** بصمة sha256 لكل ملف، ثم `DialectSchema` في `core/schema.ts` (حدود الحجم، ورفض المفاتيح الخطرة `__proto__` و`constructor` و`prototype`)، قبل الحفظ وعند كل قراءة.
- **التخزين:** في جهاز المستخدم فقط (IndexedDB). **لا يُرفع أي ملف من جهاز المستخدم أبداً.**
- **التحديث:** إشعار بوجود إصدار أحدث. فإن وافق المستخدم نُزّلت الحزمة وفُحصت، ثم استبدلها التطبيق بالقديمة محلياً مع إشعار بحذف القديمة. وإن رفض بقيت القديمة.

## AI Hook

- `core/normalizer.ts` — نقطة الوصل الذكية (تطبيع اللهجات والعبارات المركّبة).

## Scripts

- `scripts/audit.cjs` — فحص صحّة حِزم اللهجات.
- `scripts/build-dialects.cjs` — توليد `apps/web-lab/dialects.ts` و`vocabularies.ts` (قيد التحويل: سيولّد ملف الأمثلة المدمج فقط).
- `scripts/migrate-reviewstatus.cjs` — نقل `reviewStatus` من keywords إلى manifest.
