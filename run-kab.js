import fs from 'fs'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const kab = require('./data/dialects/kabyle.json')

let file = process.argv[2]
if(!file){ console.log("Usage: node run-kab.js file.kab.bayda"); process.exit(1) }

let code = fs.readFileSync(file,'utf8')
let entries = Object.entries(kab.keywords).sort((a,b)=>b[0].length-a[0].length)
for(let [k,v] of entries){
  let en = v==='log'?'console.log':v
  code = code.replace(new RegExp("\\b"+k+"\\b","g"), en)
}
eval(code)
