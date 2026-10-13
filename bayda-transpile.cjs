const fs=require('fs');
function cleanLayers(file){
  const j=JSON.parse(fs.readFileSync(file,'utf8'));
  for(const k of ['core','library','dictionary']){
    if(!j[k]) continue;
    for(const js in j[k]){
      j[k][js]=j[k][js].map(w=>w.replace(/[!،.]+$/g,'').trim()).filter(Boolean);
    }
  }
  fs.writeFileSync(file, JSON.stringify(j,null,2),'utf8');
}
["dz.layers.json","kab.layers.json"].forEach(cleanLayers);

function transpile(code, file){
  const {core,library}=JSON.parse(fs.readFileSync(file,'utf8'));
  let out=' '+code+' '; // مسافات للحدود
  const all=[];
  for(const [js,words] of Object.entries(core))
    for(const w of words) if(w.length>1) all.push([w,js,'core']);
  for(const [js,words] of Object.entries(library))
    for(const w of words) if(w.length>1) all.push([w,js,'lib']);
  // الأطول أولا باش "لوكان" قبل "كان"
  all.sort((a,b)=>b[0].length-a[0].length);

  for(const [w,js,type] of all){
    if(type==='core'){
      const re=new RegExp('(^|\\s|\\{|\\}|\\(|\\))'+w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?=\\s|\\{|\\}|\\(|\\))','g');
      out=out.replace(re, (m,p1)=>p1+js);
    } else {
      out=out.replaceAll('.'+w, '.'+js);
    }
  }
  return out.trim();
}

console.log("DZ:", transpile("ايلا x دور list { list.دفع 1 }", "dz.layers.json"));
console.log("KAB:", transpile("ila x af list { list.arnu 1 }", "kab.layers.json"));
