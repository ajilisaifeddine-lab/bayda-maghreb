# Bayda Maghreb 🌙 - Franco & Arabic Dialects

   


> Write code in your own dialect. North African transpiler - Kabyle, Libya, Tunisia, Algeria, Mauritania.



![license](https://img.shields.io/badge/license-MIT-green)



## Install

```
git clone https://github.com/ajilisaifeddine-lab/bayda-maghreb.git
cd bayda-maghreb
npm install
```

## Quick start

Create a file `hello.tn-latn.bayda` (Tunisian Franco):

```
ken (s7i7) { goul("ila") } wella { goul("no") }
```

Run it, or print the JavaScript:

```
node bayda-bin hello.tn-latn.bayda
node bayda-bin hello.tn-latn.bayda --js
```

Output:

```
if (true) { console.log("ila") } else { console.log("no") }
```

The dialect is read from the file name (`.tn-latn.bayda`), or pass `--dialect tn-latn`.

Franco dialects: `tn-latn` (Tunisian), `dz-latn` (Algerian).


### Supported Dialects

![Supported Dialects](https://raw.githubusercontent.com/ajilisaifeddine-lab/bayda-maghreb/main/docs/dialects.png)



<p align="center" • 
<a href="./lahjat/kab.js" • 
<a href="./lahjat/kab-lat.js" • 
<a href="./lahjat/ly.js" • 
<a href="./lahjat/tn-latin.js" • 
<a href="./lahjat/dz.js" • 
<a href="./lahjat/dz-latin.js" • 
<a href="./lahjat/mauritania.js" • 
