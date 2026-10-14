# Bayda Maghreb 🌙 - Franco & Arabic Dialects

   


> Write code in your own dialect. North African transpiler - Kabyle, Libya, Tunisia, Algeria, Mauritania.



![license](https://img.shields.io/badge/license-MIT-green)



## Install

```
npm i -g bayda-maghreb
```

## Quick start

Create a file `hello.tn-latn.bayda` (Tunisian Franco):

```
ken (s7i7) { goul("ila") } wella { goul("no") }
```

Run it, or print the JavaScript:

```
bayda hello.tn-latn.bayda
bayda hello.tn-latn.bayda --js
```

Output:

```
if (true) { console.log("ila") } else { console.log("no") }
```

The dialect is read from the file name (`.tn-latn.bayda`), or pass `--dialect tn-latn`.

Franco dialects: `tn-latn` (Tunisian), `dz-latn` (Algerian).


### Supported Dialects

![Supported Dialects](https://raw.githubusercontent.com/ajilisaifeddine-lab/bayda-maghreb/main/docs/dialects.png)



| Code | Name | Dictionary |
|---|---|---|
| `kab` | Kabyle | [data/dialects/kabyle.json](data/dialects/kabyle.json) |
| `kab-lat` | Kabyle Latin | [data/dialects/kabyle-latin.json](data/dialects/kabyle-latin.json) |
| `ly` | Libya | [data/dialects/libya.json](data/dialects/libya.json) |
| `mauritania` | Mauritania Gen Z | [data/dialects/mauritania.json](data/dialects/mauritania.json) |
| `tn-latn` | Tounsi Franco | [data/dialects/tunisia_franco.json](data/dialects/tunisia_franco.json) |
| `dz` | Dzair | [data/dialects/algeria.json](data/dialects/algeria.json) |
| `dz-latn` | Dzair Franco | [data/dialects/algeria_franco.json](data/dialects/algeria_franco.json) |
