Core Pipeline: loader -> lexer -> normalizer -> parser/program -> compile/targets -> writers
Extensibility: new dialect = JSON only, new target = writer only
AI Hook: normalizer.ts


- **`scripts/audit.cjs`**: أداة لفحص صحة جميع حزم اللهجات في `packages/` (مرجع: النسخة المؤقتة في `archive/audit.cjs`).
- **`apps/web-lab/repl.js`**: بيئة تفاعلية (REPL) للمختبر، مبنية على المحرك الجديد.
