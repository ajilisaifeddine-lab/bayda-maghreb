const fs=require('fs');
const [f,from,concept,to,newName]=process.argv.slice(2);
if(!f||!from||!concept||!to){console.log('Usage: node move-concept.cjs file fromLayer concept toLayer [newName]');process.exit(1)}
const d=JSON.parse(fs.readFileSync(f,'utf8'));
if(!d[from]||!d[to]||!d[from][concept]){console.log('Not found: '+from+':'+concept);process.exit(1)}
const n=newName||concept;
d[to][n]=[...new Set([...(d[to][n]||[]),...d[from][concept]])];
delete d[from][concept];
fs.writeFileSync(f,JSON.stringify(d,null,2)+'\n');
console.log(from+':'+concept+' -> '+to+':'+n);
