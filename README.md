# Bayda Maghreb - Franco & Arabic Dialects

Write code in your own dialect. North African transpiler - Kabyle, Libya, Tunisia, Algeria, Mauritania.

### Supported Dialects

| Code | Name | Words | Type |
| :--- | :--- | :---: | :--- |
| kab | Kabyle | 72 | Code |
| kab-lat | Kabyle Latin | 104 | Code |
| ly | Libya | 337 | Code |
| tn-latn | Tounsi Franco | 205 | Code |
| dz | Dzair Arabic | 110 | Code |
| dz-latn | Dzair Franco | 114 | Code |
| mauritania | Mauritania Gen Z | 177 | Vocabulary |

### Install

npm install bayda-maghreb
npm install -g bayda-maghreb

### Usage CLI

npx bayda init --dialect tn-latn
npx bayda hello.tn-latn.bayda
npx bayda hello.tn-latn.bayda --js

### Usage Code

import { transpile } from "bayda-maghreb";
const js = transpile(source, "dz-latn");

> Only keywords translated. mauritania is word list.

### License MIT
