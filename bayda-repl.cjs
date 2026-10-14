#!/usr/bin/env node
const fs = require('fs');
const readline = require('readline');
const transpile = require('./bayda-transpile.cjs');
const DIALECT = 'data/dialects/tunisia_franco.json';
const vm = require('vm');
const context = { console, setTimeout, setInterval };
vm.createContext(context);
const declaredGlobal = new Set();
console.log('\n🇹🇳 Bayda REPL - اكتب بالتونسي Franco');
console.log(' خروج: exit\n');
const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: 'bayda> ' });
let buffer = ''; let braceCount = 0; rl.prompt();
function fixRedeclaration(js){
  return js.split('\n').map(line=>{
    const m = line.match(/^\s*let\s+([A-Za-z_]\w*)\s*=/);
    if(m){
      const v=m[1];
      if(declaredGlobal.has(v)) return line.replace(/^\s*let\s+/, '');
      else declaredGlobal.add(v);
    }
    return line;
  }).join('\n');
}
rl.on('line', (line) => {
  const trimmed = line.trim();
  if (trimmed === 'exit' || trimmed === 'okhrej') { console.log('beslema! 👋'); process.exit(0); }
  if (!trimmed) { rl.prompt(); return; }
  buffer += '\n' + line;
  braceCount += (line.match(/{/g) || []).length;
  braceCount -= (line.match(/}/g) || []).length;
  if (braceCount > 0) { rl.setPrompt('... '); rl.prompt(); return; }
  try {
    let js = transpile(buffer, DIALECT);
    js = fixRedeclaration(js);
    const result = vm.runInContext(js, context);
    if (result!== undefined) console.log(result);
  } catch (e) { console.error('❌', e.message); }
  buffer = ''; rl.setPrompt('bayda> '); rl.prompt();
});
rl.on('close', () => { console.log('\nbeslema! 👋'); process.exit(0); });
