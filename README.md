# Bayda Maghreb 🌙

**A programming language for North African dialects.**
**لغة برمجة بلهجات شمال إفريقيا.**

Write code in your own dialect. Transpile to JavaScript & Python.
اكتب كود بلهجتك. تحول إلى JavaScript و Python.

---

## Features / 

*   **7 Supported Dialects / 7 لهجات مدعومة:** 
    Tunisian, Algerian, Libyan, Mauritanian, Kabyle (Latin/Tifinagh), and         Shilha.
    تونسي، جزائري، ليبي، موريتاني، قبائلي (لاتيني/تيفيناغ)، وتشلحيت.
*   **Multi-Target Transpiler / مترجم متعدد الأهداف:** 
    Transpiles to JavaScript and Python.
    يحول إلى JavaScript و Python.
*   **Smart Lexer / محلل لغوي ذكي:** 
    Handles Franco-Arabic digits (e.g., 5ayb, 3lik) as letters, not numbers.
    يتعامل مع أرقام الفرانكو (مثل 5ayb، 3lik) كحروف، وليس كأرقام.
*   **Fully Tested / مختبر بالكامل:** 
    87 unit tests ensuring core stability.
    أكثر من 87 اختباراً لضمان استقرار النواة.

---

## Supported Dialects / اللهجات المدعومة

| Dialect     | Code          | Script   |
| :---        | :---          | :---     |
| Tunisian    | tn-latn       | Franco   |
| Algerian    | dz-latn       | Franco   |
| Libyan      | ly-latn       | Franco   |
| Mauritanian | mr-latn       | Franco   |
| Kabyle      | kab-latn      | Latin    |
| Kabyle      | kab-tifinagh  | Tifinagh |
| Shilha      | shi-latn      | Latin    |

---

## Install & Usage / التثبيت والاستخدام

Install globally:
    npm i -g bayda-maghreb

Create a file hello.tn-latn.bayda:
    ktab("salam")
    idha (haqq) {
        ktab("Hello World")
    }

Run it (Default: JavaScript):
    bayda hello.tn-latn.bayda

Transpile to Python:
    bayda hello.tn-latn.bayda --py

---

## Library API / واجهة المكتبة

```js
import { translate, translateDialect, listDialects, getDialectInfo } from "bayda-maghreb";

// 1) ترجمة خالصة (تعمل في Node والمتصفح) — تمرّر خريطة كلمات اللهجة بنفسك
translate('goul("salam")', { keywords: { goul: "print" }, target: "js" }).code;
// => 'console.log("salam");'

// 2) ترجمة عبر تحميل اللهجة من القرص (Node)
translateDialect('idha (s7i7) { goul("a") }', { dialect: "tn-latn", target: "py" }).code;

// 3) سرد اللهجات (مصدر الحقيقة الواحد)
listDialects();          // [{ id, name, script, keywordCount, ... }, ...]
getDialectInfo("tn-latn"); // { id, manifest, keywords, vocabulary }
```

كل المسار يمرّ عبر `translate()`: `packages/*.json → loader → lexer → normalizer → program.ts → writers`.
راجع [`ARCHITECTURE.md`](./ARCHITECTURE.md) للتفاصيل.

---

## Legal & License / قانوني والترخيص

This project is 100% legal and ethical.
هذا المشروع قانوني وأخلاقي 100%.

*   **No copied content:** Built on linguistic observation.
*   **No personal data:** We do not scrape or store user data.
*   **License:** **AGPL-3.0**.

**Commercial Use:** If you wish to use this project in a closed-source commercial product, you must contact the author for a separate commercial license. This protects the project from exploitation.

**الاستخدام التجاري:** إذا كنت ترغب في استخدام هذا المشروع في منتج تجاري مغلق المصدر، يجب عليك التواصل مع المؤلف للحصول على ترخيص تجاري منفصل. هذا يحمي المشروع من الاستغلال.

---

## Contributing / المساهمة

We welcome linguistic observations and code improvements.
نرحب بالملاحظات اللغوية والتحسينات البرمجية.

1.  **Issues:**           Report bugs or suggest new dialects.
2.  **Pull Requests:**    Submit improvements. Note: All contributions                                  require requiresConsent: true.

Please read docs/SOURCES.md before contributing.

---
*Copyright (c) 2026 ajilisaifeddine-lab. Built for the next generation of North African developers.*
