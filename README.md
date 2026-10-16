# Bayda Maghreb 🌙 - Franco & Arabic Dialects

> Write code in your own dialect. North African transpiler - Kabyle, Libya, Tunisia, Algeria, Mauritania.
> اكتب كود بلهجتك. محول لهجات شمال افريقيا - قبايلي، ليبي، تونسي، جزائري، حساني.

![license](https://img.shields.io/badge/license-MIT-green)
![legal](https://img.shields.io/badge/legal-GDPR%20%2B%20ToS%20Compliant-blue)
![status](https://img.shields.io/badge/status-Open%20For%20Contribution-orange)

---

## What is this? / ما هذا؟

**English:** Bayda is a programming language that lets you code in Franco-Arabic (Arabizi). It transpiles your dialect to JavaScript. Supports Tifinagh, Arabic, and Latin.

**عربي:** بيضاء لغة برمجة تكتب بلهجتك بالفرانكو-عربي. تحول كودك الى JavaScript. تدعم تيفيناغ، عربي، لاتيني.

**Example:** `achou -> acu / ⴰⵛⵓ / واشو` - one word, all scripts.

---

## Legal & Sources / قانوني ومصادر

This project is **100% legal and ethical**.

- No copied content / لا نسخ محتوى
- No personal data / لا بيانات شخصية  
- Based on Linguistic Observation / مبني على ملاحظة لغوية
- Transformative Use / استخدام تحويلي

**Full legal methodology:** See [docs/SOURCES.md](docs/SOURCES.md)

**Compliance:** ToS Compliant, GDPR Compliant, Feist v. Rural Doctrine, MIT License.

---

## Install / تثبيت

```bash
npm i -g bayda-maghreb



Quick Start / بداية سريعة
Create a file hello.tn-latn.bayda (Tunisian Franco):
ken (s7i7) { goul("ila") } wella { goul("no") }

Run it, or print the JavaScript:
bayda hello.tn-latn.bayda
bayda hello.tn-latn.bayda --js

Output
if (true) { console.log("ila") } else { console.log("no") }

The dialect is read from the file name (.tn-latn.bayda), or pass --dialect tn-latn.
Franco dialects: tn-latn (Tunisian), dz-latn (Algerian).

Core files:
core/detector.ts -> Franco detection / كشف الفرانكو • core/transliterator.ts -> achou -> acu / ⴰⵛⵓ / واشو 


Open For Contribution / مفتوح للمساهمة والدعم
This project is open for observation, support, and modification.

عربي: هذا المشروع مفتوح للملاحظة، الدعم، والتعديل من المجتمع.

We welcome:
• ملاحظة لغوية / Linguistic observation • اضافة لهجات / New dialects • تصحيح ترجمة / Fix transliteration • تحسين كود / Code improvement 
How to contribute / كيف تساهم:
1. Issues (ملاحظة): https://github.com/ajilisaifeddine-lab/bayda-maghreb/issues/new 2. Pull Requests (تعديل): https://github.com/ajilisaifeddine-lab/bayda-maghreb/pulls  • All contributions require requiresConsent: true / كل المساهمات تتطلب موافقة • Please read docs/SOURCES.md before contributing • No personal data, public observation only 

License / الترخيص
MIT License - Copyright (c) 2026 ajilisaifeddine-lab

For linguistic research and educational purposes only.
للأغراض البحثية اللغوية والتعليمية فقط.
