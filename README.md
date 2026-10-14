# bayda-maghreb - لغة بيضا بالدارجة

> لغة برمجة بالدارجة المغاربية - 7 لهجات + Gen 2 Tech

## هــاو كــيـفــاش / How it works

### في البروزر و الـ PC (يدعم العربي):
```bash
bayda <file>     خـدّم دوسـي لـبـيـضـا
bayda init       حـل پـروجـي جـديـد
bayda --version  ورّي لـكـوپـي
bayda --help     ورّي الـسّوپـور
exit
node bayda-repl.cjs
exit
node bayda-repl.cjs
ged x = 0
toulma x < 3 {
goul x
ged x = x + 1
}
exit
cat > bayda-repl.cjs << 'EOF'
#!/usr/bin/env node
const readline = require('readline');
const transpile = require('./bayda-transpile.cjs');
const DIALECT = 'data/dialects/tunisia_franco.json';
const vm = require('vm');

const context = {
  console: { log: (...a) => console.log(...a) },
  setTimeout, setInterval
};
vm.createContext(context);
const declaredGlobal = new Set();

console.log('\n🇹🇳 Bayda REPL Debug');
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
  const t = line.trim();
  if (t==='exit') { console.log('beslema!'); process.exit(0); }
  if (!t) { rl.prompt(); return; }
  buffer += '\n' + line;
  braceCount += (line.match(/{/g)||[]).length;
  braceCount -= (line.match(/}/g)||[]).length;
  if (braceCount>0) { rl.setPrompt('... '); rl.prompt(); return; }
  try {
    let js = transpile(buffer, DIALECT);
    js = fixRedeclaration(js);
    console.log('[JS]->', js.replace(/\n/g,' | '));
    const result = vm.runInContext(js, context);
    console.log('[done]');
  } catch(e){ console.error('❌', e.message, e.stack); }
  buffer=''; rl.setPrompt('bayda> '); rl.prompt();
});
