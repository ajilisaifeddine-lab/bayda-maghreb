const fs=require('fs');
const d=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const file=process.argv[3];
if(!file){console.log('Usage: node translate.cjs dialect.layers.json file');process.exit(1)}
const map=new Map();
for(const l of ['core','library'])for(const [c,ws] of Object.entries(d[l]))for(const w of ws)map.set(w,c);
const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const alt=[...map.keys()].sort((a,b)=>b.length-a.length).map(esc).join('|');
const re=new RegExp('(?<![\\p{L}\\p{N}_])('+alt+')(?![\\p{L}\\p{N}_])','gu');
const src=fs.readFileSync(file,"utf8");console.log(src.split(/("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/).map((p,i)=>i%2?p:p.replace(re,m=>map.get(m))).join(""));
