"use strict";
const fs=require("fs"),path=require("path");
const ROOT=path.join(__dirname,".."),PKG=path.join(ROOT,"packages");
const base=JSON.parse(fs.readFileSync(path.join(ROOT,"core/lessons.json"),"utf8"));
const LEX={
  "dz-arab":{salam:"سلام",ahlan:"مرحبا",yalla:"هيا",sun:"شمس",rain:"شتاء",yes:"إيه",no:"لالا"},
  "dz-latn":{salam:"salam",ahlan:"marhba",yalla:"yalla",sun:"chems",rain:"chta",yes:"wah",no:"lala"},
  "tn-arab":{salam:"عسلامة",ahlan:"مرحبا",yalla:"هيا",sun:"شمس",rain:"مطر",yes:"إيه",no:"لا"},
  "tn-latn":{salam:"aslema",ahlan:"marhba",yalla:"yalla",sun:"chams",rain:"mthar",yes:"ey",no:"le"},
  "ma-arab":{salam:"سلام",ahlan:"مرحبا",yalla:"يلا",sun:"شمس",rain:"شتا",yes:"واخا",no:"لا"},
  "ma-latn":{salam:"salam",ahlan:"mrhba",yalla:"yalla",sun:"chems",rain:"chta",yes:"wakha",no:"la"},
  "ly-arab":{salam:"سلام",ahlan:"أهلاً",yalla:"هيا",sun:"شمس",rain:"مطر",yes:"إيه",no:"لا"},
  "ly-latn":{salam:"salam",ahlan:"ahlan",yalla:"yalla",sun:"shams",rain:"matar",yes:"ey",no:"la"},
  "mr-arab":{salam:"سلام",ahlan:"مرحبا",yalla:"هيا",sun:"شمس",rain:"مطر",yes:"أيوا",no:"لا"},
  "mr-latn":{salam:"salam",ahlan:"marhba",yalla:"yalla",sun:"shams",rain:"mtar",yes:"eywa",no:"la"},
  "kab-latn":{salam:"azul",ahlan:"ansuf",yalla:"ddut",sun:"itij",rain:"ageffur",yes:"ih",no:"ala"},
  "shi-latn":{salam:"azul",ahlan:"marhba",yalla:"yalla",sun:"tafukt",rain:"anzar",yes:"yyih",no:"uhu"},
  "kab-tifinagh":{salam:"ⴰⵣⵓⵍ",ahlan:"ⴰⵏⵙⵓⴼ",yalla:"ⴷⴷⵓⵜ",sun:"ⵉⵟⵉⵊ",rain:"ⴰⴳⴻⴼⴼⵓⵔ",yes:"ⵉⵀ",no:"ⴰⵍⴰ"}
};
const RE=/\b(salam|ahlan|yalla|sun|rain|yes|no)\b/g;
const SKIP=new Set(["id","status","kind","requires","op","node"]);
const adapt=(v,m,k="")=>{
  if(SKIP.has(k))return v;
  if(typeof v==="string")return v.replace(RE,w=>m[w]||w);
  if(Array.isArray(v))return v.map(x=>adapt(x,m,k));
  if(v&&typeof v==="object"){const o={};for(const key of Object.keys(v))o[key]=adapt(v[key],m,key);return o;}
  return v;
};
for(const id of Object.keys(LEX).sort()){
  const dir=path.join(PKG,id);
  if(!fs.existsSync(path.join(dir,"manifest.json")))continue;
  fs.writeFileSync(path.join(dir,"lessons.json"),JSON.stringify(adapt(base,LEX[id]),null,2)+"\n");
}
console.log("built",Object.keys(LEX).length,"lesson packs");
