const fs=require('fs');
const _cache=new Map();
const _esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const _skip=/("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`|\/\/[^\n]*|\/\*[\s\S]*?\*\/)/;
function _load(file){
  const key=file+':'+fs.statSync(file).mtimeMs;
  if(_cache.has(key)) return _cache.get(key);
  const data=JSON.parse(fs.readFileSync(file,'utf8'));
  const map=new Map();
  for(const k of ['core','library']){
    const sec=data[k];
    if(!sec) continue;
    for(const js in sec) for(const w of sec[js]) if(w&&w.length>1&&!map.has(w)) map.set(w,js);
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
  return String(code).split(_skip).map((p,i)=>i%2?p:p.replace(re,m=>map.get(m))).join('').trim();
}
module.exports=transpile;
module.exports.transpile=transpile;
