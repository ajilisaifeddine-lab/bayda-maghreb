const fs=require('fs');
const files=fs.readdirSync('.').filter(f=>f.endsWith('.layers.json'));
let ok=true;
for(const file of files){
  console.log(`\n=== ${file} ===`);
  try{
    const j=JSON.parse(fs.readFileSync(file,'utf8'));
    const core=j.core||{}; const keys=Object.keys(core);
    console.log(`keys: ${keys.length} / 24`);
    if(keys.length!==24){ ok=false; console.log('❌ ناقص مفاهيم'); }
    const allVals=[]; for(const k of keys){ for(const v of core[k]) allVals.push(v); }
    const hasAr=/[\u0600-\u06FF]/.test(JSON.stringify(core));
    const hasLatn=/[a-z]{3,}/.test(JSON.stringify(core));
    console.log(`كتابة: ${hasAr?'عربي ✅':''} ${hasLatn?'latin ✅':''}`);
  }catch(e){ console.log(`❌ JSON: ${e.message}`); ok=false; }
}
console.log('\n'+(ok?'✅ كل الملفات سليمة برمجيا ومعلوماتيا':'❌ يوجد أخطاء'));
