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

- **المختبر** `apps/web-lab/`: **رفيع**. يستورد `translate()` من النواة، وبيانات اللهجات مُضمّنة وقت البناء من الجذر (`packages/`) عبر `scripts/build-dialects.cjs` → `dialects.ts` / `vocabularies.ts`. لا `fetch` وقت التشغيل، ولا نسخة مكرّرة من `packages/`، ولا منطق لغوي داخله.
- **CLI** `bayda-bin`: يقرأ ملف `.bayda`، يحمّل اللهجة، ثم `translateDialect()` ويطبع/ينفّذ الناتج.
- **المكتبة** `index.ts` (تُبنى إلى `dist/` عبر `tsc`).

## AI Hook

- `core/normalizer.ts` — نقطة الوصل الذكية (تطبيع اللهجات والعبارات المركّبة).

## Scripts

- `scripts/audit.cjs` — فحص صحّة حِزم اللهجات.
- `scripts/build-dialects.cjs` — توليد `apps/web-lab/dialects.ts` و`vocabularies.ts`.
- `scripts/migrate-reviewstatus.cjs` — نقل `reviewStatus` من keywords إلى manifest.
