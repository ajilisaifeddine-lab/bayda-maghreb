#!/usr/bin/env node
const fs=require('fs');
const _cache=new Map();
const _esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const _skip=/("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`|(?:\/\/[^\n]*|\/\*[^]*?\*\/))/;
function _load(file){
  const key=file+':'+fs.statSync(file).mtimeMs;
  if(_cache.has(key)) return _cache.get(key);
  const data=JSON.parse(fs.readFileSync(file,'utf8'));
  const map=new Map();
  const ALIAS={'print':'console.log','log':'console.log'};
  if(data.keywords){
    for(const [w,c] of Object.entries(data.keywords)){
      const js=ALIAS[c]||c;
      if(w.length>1&&!map.has(w)) map.set(w,js);
    }
  }
  for(const k of ['core','library']){
    const sec=data[k];
    if(!sec) continue;
    for(const js in sec) for(const w of sec[js]){
      if(w&&w.length>1&&!map.has(w)) map.set(w,ALIAS[js]||js);
    }
  }
  if(!map.size){
    for(const [w,c] of Object.entries(data)){
      if(['core','library','keywords'].includes(w)) continue;
      if(typeof c==='string' && w.length>1){
        map.set(w, ALIAS[c]||c);
      }
    }
  }
  if(!map.size) throw new Error('no core/library words in '+file);
  const alt=[...map.keys()].sort((a,b)=>b.length-a.length).map(_esc).join('|');
  const re=new RegExp('(?<![\\p{L}\\p{N}_])('+alt+')(?![\\p{L}\\p{N}_])','gu');
  const r={map,re};
  _cache.set(key,r);
  return r;
}
function transpile(code,file){
  const {map,re}=_load(file);
  let out = String(code).split(_skip).map((p,i)=>i%2?p:p.replace(re,m=>map.get(m))).join('').trim();
  out = out.replace(/\b(if|while|for)\s+([^\n]+?)\s*\{/g, (m,k,c)=>{let d=0,w=c[0]==='(';for(let i=0;i<c.length;i++){if(c[i]==='(')d++;else if(c[i]===')'){d--;if(d===0&&i<c.length-1){w=false;break;}}}return k+' '+(w&&c.endsWith(')')?c:'('+c+')')+' {';});
  out = out.replace(/console\.log\s*(?!\()((?:[^\n:{}]+)+)/g, 'console.log($1)');
  const scopes = [new Set()];
  out = out.split('\n').map(line=>{
    const m = line.match(/^\s*let\s+([A-Za-z_\w]+)\s*=/);
    let res = line;
    if(m){
      const v = m[1];
      if(scopes.some(s=>s.has(v))) res = line.replace(/^\s*let\s+/, ' ');
      else scopes[scopes.length-1].add(v);
    }
    for(const ch of line.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`/g,'')){
      if(ch==='{') scopes.push(new Set());
      else if(ch==='}' && scopes.length>1) scopes.pop();
    }
    return res;
  }).join('\n');
  return out.trim();
}
module.exports=transpile;
module.exports.transpile=transpile;
