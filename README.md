# Bayda Maghreb 🌙 - Franco & Arabic Dialects

North African dialect transliteration library - Kabyle, Libya, Tunisia, Algeria, Mauritania.

## v1.0 - 7 dialects green ✅

| Code | Name | File | Words |
|------|------|------|-------|
| kab | Kabyle | kabyle.json | 68 |
| kab-lat | Kabyle Latin | kabyle-latin.json | 103 |
| ly | Libya | libya.json | 245 |
| mauritania | Mauritania | mauritania.json | 177 |
| tn-latn | Tounsi | tunisia_franco.json | 188 |
| dz | Dzair Arabic | algeria.json | 97 |
| dz-latn | Dzair Franco | algeria_franco.json | 100 |

## Install

```bash
npm install bayda-maghreb

## Usage

CLI:

    npx bayda-maghreb file.bayda tn-latn

Code:

    import { transpile } from "bayda-maghreb";
    console.log(transpile(source, "tn-latn"));

Dialects: kab, kab-lat, ly, mauritania, tn-latn, dz, dz-latn
