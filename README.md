# Bayda Maghreb 🌙 - Franco & Arabic Dialects

North African dialect transliteration library - Kabyle, Libya, Tunisia, Algeria, Mauritania.

## Dialects

| Code | Name | File | Words |
|------|------|------|-------|
| kab | Kabyle | kabyle.json | 72 |
| kab-lat | Kabyle Latin | kabyle-latin.json | 104 |
| ly | Libya | libya.json | 337 |
| mauritania | Mauritania Gen Z | mauritania.json | 177 |
| tn-latn | Tounsi Franco | tunisia_franco.json | 205 |
| dz | Dzair | algeria.json | 110 |
| dz-latn | Dzair Franco | algeria_franco.json | 114 |

## Install

```bash
npm install bayda-maghreb

## Usage

Command line. The dialect comes from the file name (hello.kab.bayda), or from --dialect:

    bayda init                      create hello.kab.bayda
    bayda init --dialect tn-latn    create hello.tn-latn.bayda
    bayda hello.kab.bayda           translate and run
    bayda hello.kab.bayda --js      print the JavaScript only
    bayda prog.bayda --dialect ly   choose the dialect by hand

If the file name has no dialect code, kab is used.

Code:

    import { transpile } from "bayda-maghreb";
    console.log(transpile(source, "tn-latn"));

Only language words (if, else, function, console.log and so on) are translated. Text in quotes and comments stay as they are. The mauritania file is a word list, so it does not translate code.
