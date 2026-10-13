const fs=require('fs');
const {execSync}=require('child_process');
const files=[
  'data/dialects/algeria.json',
  'data/dialects/algeria_franco.json',
  'data/dialects/kabyle.json',
  'data/dialects/kabyle-latin.json',
  'data/dialects/libya.json',
  'data/dialects/mauritania.json',
  'data/dialects/tunisia_franco.json',
  'dialects/mauritania.json'
].filter(f=>fs.existsSync(f));

for(const f of files){
  const base = f.split('/').pop().replace('.json','.layers.json');
  // لا نعيد كتابة القبائلية والليبية الجاهزتين
  if(['kab.layers.json','ly.layers.json'].includes(base) && fs.existsSync(base)){
    console.log(`SKIP ${base} already OK`);
    continue;
  }
  try{
    console.log(`CONVERT ${f} -> ${base}`);
    execSync(`node make-layers2.cjs ${f} ${base}`,{stdio:'inherit'});
  }catch(e){ console.log(`FAIL ${f}`); }
}
