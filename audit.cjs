const fs=require('fs'),path=require('path'),cp=require('child_process');
let E=0,W=0;
const err=m=>{E++;console.log(' ERROR: '+m)};
const warn=m=>{W++;console.log(' warn:  '+m)};
const ok=m=>console.log(' ok:    '+m);
const sec=t=>console.log('\n== '+t+' ==');
const rd=f=>fs.readFileSync(f,'utf8');
const walk=(d,o=[])=>{for(const n of fs.readdirSync(d)){if(n==='node_modules'||n==='.git')continue;const p=path.join(d,n);fs.statSync(p).isDirectory()?walk(p,o):o.push(p)}return o};
const all=walk('.');
const js=all.filter(f=>/\.(js|mjs|cjs)$/.test(f)&&path.basename(f)!=='audit.cjs');
const JSW=new Set('if else while for break continue function return true false null let const switch import export class new try catch finally throw await async Array String Number Object Boolean filter map reduce find push pop console.log sort replace split join stringify promise error call apply bind global module process prompt'.split(' '));

sec('package.json');
let pkg;
try{pkg=JSON.parse(rd('package.json'))}catch(e){err('package.json: '+e.message)}
if(pkg){
  for(const k of ['name','version','description','license'])if(!pkg[k])warn('missing field: '+k);
  if(pkg.type!=='module')warn('type is not "module"');
  const entry=pkg.main||(typeof pkg.exports==='string'&&pkg.exports);
  if(entry){fs.existsSync(entry)?ok('main: '+entry):err('main file missing: '+entry)}else warn('no main/exports');
  if(pkg.bin)for(const [k,v] of Object.entries(typeof pkg.bin==='string'?{bin:pkg.bin}:pkg.bin))fs.existsSync(v)?ok('bin '+k):err('bin file missing: '+v);
  if(pkg.files){for(const f of pkg.files)if(!fs.existsSync(f.replace(/\/$/,'').replace(/\*.*$/,'')||'.'))err('"files" entry missing: '+f)}
  else warn('no "files" field: npm publishes everything not ignored');
  if(!(pkg.scripts&&pkg.scripts.test))warn('no test script');
}

sec('JS syntax ('+js.length+' files)');
let bad=0;
for(const f of js){try{cp.execFileSync('node',['--check',f],{stdio:'pipe'})}catch(e){bad++;err(f+': '+String(e.stderr).split('\n').filter(Boolean).slice(0,3).join(' | '))}}
if(!bad)ok('all files parse');

sec('imports');
const bi=new Set(require('module').builtinModules);
const deps={...(pkg&&pkg.dependencies),...(pkg&&pkg.devDependencies),...(pkg&&pkg.peerDependencies)};
let ie=0;
for(const f of js){
  const t=rd(f);let m;
  const r1=/(?:from\s*|import\s*\(\s*|require\s*\(\s*)['"](\.{1,2}\/[^'"]+)['"]/g;
  while((m=r1.exec(t))){
    const p=path.resolve(path.dirname(f),m[1]);
    if(!fs.existsSync(p)){
      const ext=['.js','.json','.mjs','.cjs'].find(x=>fs.existsSync(p+x));
      if(ext&&/\.cjs$/.test(f))continue;
      ie++;err(f+': import "'+m[1]+'" '+(ext?'needs the extension '+ext+' (ESM requires full file names)':'file does not exist'));
    }
  }
  const r2=/(?:from\s*|require\s*\(\s*)['"]([^.\/'"][^'"]*)['"]/g;
  while((m=r2.exec(t))){
    const name=m[1].replace(/^node:/,'');
    const base=name.startsWith('@')?name.split('/').slice(0,2).join('/'):name.split('/')[0];
    if(!bi.has(name)&&!bi.has(base)&&!deps[base]){ie++;err(f+': package "'+base+'" is not in dependencies')}
  }
}
if(!ie)ok('all imports resolve');

sec('risky code');
let risk=0;
for(const f of js){
  const t=rd(f);
  if(/\beval\s*\(|new Function\s*\(/.test(t)){warn(f+': eval/new Function runs any text as code');risk++}
  if(t.includes('\\b')){warn(f+': uses \\b in a regex; it only understands Latin letters (breaks Arabic, Tifinagh, special letters)');risk++}
}
if(!risk)ok('none found');

sec('dialect files');
const df=all.filter(f=>/data[\\\/]dialects[\\\/].+\.json$/.test(f));
if(!df.length)err('no dialect files found in data/dialects');
const codes={};
for(const f of df){
  const raw=rd(f);let d;
  try{d=JSON.parse(raw)}catch(e){err(f+': invalid JSON - '+e.message);continue}
  for(const k of ['code','name','keywords'])if(d[k]==null)err(f+': missing "'+k+'"');
  if(!d.script)warn(f+': no "script" field');
  if(d.code)(codes[d.code]=codes[d.code]||[]).push(f);
  const kw=d.keywords;
  if(!kw||typeof kw!=='object'||Array.isArray(kw)){err(f+': keywords must be an object');continue}
  const cnt={};
  for(const m of raw.matchAll(/^ {4}"((?:[^"\\]|\\.)*)"\s*:/gm))cnt[m[1]]=(cnt[m[1]]||0)+1;
  for(const [k,n] of Object.entries(cnt))if(n>1)err(f+': duplicate key "'+k+'" x'+n+' (JSON silently keeps only the last)');
  let nonjs=0;const total=Object.keys(kw).length;
  for(const [k,v] of Object.entries(kw)){
    if(typeof v!=='string'||!v.trim())err(f+': bad value for "'+k+'"');
    else if(!JSW.has(v))nonjs++;
    if(!k||k!==k.trim())err(f+': key empty or has edge spaces: "'+k+'"');
    else if(/\s/.test(k))warn(f+': multi-word key "'+k+'" (the translator splits on spaces)');
    if(/[-+*\/.]/.test(k))warn(f+': key "'+k+'" has an operator character (- means minus in code)');
  }
  ok(f+': '+total+' keywords');
}
for(const [c,fl] of Object.entries(codes))if(fl.length>1)warn('code "'+c+'" is used by '+fl.length+' files: '+fl.join(', '));

sec('dialect registry');
const rf=js.find(f=>/dialect-registry\.js$/.test(f));
if(!rf)warn('dialect-registry.js not found');
else{
  const t=rd(rf);
  const refs=[...new Set([...t.matchAll(/['"`]([^'"`]*\.json)['"`]/g)].map(m=>path.basename(m[1])))];
  const names=new Set(df.map(f=>path.basename(f)));
  for(const r of refs)if(!names.has(r))err('registry points to a missing file: '+r);
  for(const n of names)if(!refs.includes(n))warn('dialect file not in registry: '+n);
  ok('registry lists '+refs.length+' files');
}

sec('npm pack (what gets published)');
try{
  const o=JSON.parse(cp.execFileSync('npm',['pack','--dry-run','--json'],{stdio:['ignore','pipe','pipe']}).toString());
  const files=o[0].files.map(f=>f.path);
  console.log(' files:',files.length,'| size:',o[0].size,'bytes');
  for(const f of df){const rel=f.split(path.sep).join('/');if(!files.includes(rel))err('dialect file NOT published: '+rel)}
  const junk=/(\.layers\.json|\.bayda|\.log|\.env|screenshot[^\/]*|(^|\/)test\.[^\/]*|(^|\/)(translate|check|make|add|move|split|audit|run)[^\/]*\.cjs)$/i;
  for(const f of files)if(junk.test(f))warn('probably should not be published: '+f);
}catch(e){err('npm pack failed: '+String(e.stderr||e.message).split('\n')[0])}

sec('npm test');
try{
  const out=cp.execFileSync('npm',['test','--silent'],{stdio:'pipe',timeout:60000}).toString();
  ok('passed');console.log(out.trim().split('\n').slice(-4).join('\n'));
}catch(e){err('npm test failed (exit '+e.status+'): '+String(e.stdout||'').trim().split('\n').slice(-4).join(' | ')+' '+String(e.stderr||'').trim().split('\n').slice(0,3).join(' | '))}

sec('secrets and git');
const sre=/(npm_[A-Za-z0-9]{30,}|ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/;
let s=0;
for(const f of all){
  if(/\.(png|jpg|jpeg|gz|zip)$/i.test(f)||fs.statSync(f).size>2e6)continue;
  if(sre.test(rd(f))){err('possible secret in '+f);s++}
}
if(!s)ok('no secrets found');
if(!fs.existsSync('.gitignore'))warn('no .gitignore');
else if(!/node_modules/.test(rd('.gitignore')))warn('.gitignore does not list node_modules');

if(fs.existsSync('check-layers.cjs')){
  sec('layers');
  try{console.log(cp.execFileSync('node',['check-layers.cjs'],{stdio:'pipe'}).toString().trim())}
  catch(e){err('layers check failed:\n'+String(e.stdout).trim())}
}

sec('project health');
const os=require('os');
const CORE=new Set('if else while for break continue function return true false null let const switch import export class new try catch finally throw await async'.split(' '));
const LIBN=new Set('Array String Number Object Boolean filter map reduce find push pop console.log sort replace split join stringify promise error call apply bind global module process prompt length'.split(' '));
const sh=(c,a,o={})=>cp.execFileSync(c,a,{stdio:['ignore','pipe','pipe'],...o}).toString();
for(const f of fs.readdirSync('.')){
  if(f==='node_modules'||f==='.git')continue;
  if(/[^\x00-\x7F]/.test(f)||(f.length<=2&&!f.startsWith('.'))||/\.bak$|\.log$/.test(f)||/^(bayda-bi|\.gitignor|h)$/.test(f))warn('suspicious file in root: '+f);
}
try{
  const u=sh('git',['ls-files','-o','--exclude-standard']).split('\n').filter(Boolean);
  if(u.length)warn('untracked files: '+u.join(', '));
  const dirty=sh('git',['status','--porcelain','--untracked-files=no']).split('\n').filter(Boolean);
  if(dirty.length)warn(dirty.length+' tracked files have uncommitted changes');
  const tr=sh('git',['ls-files']).split('\n').filter(f=>/(^|\/)(run-kab\.js|translate\.cjs|move-concept\.cjs|full-audit\.cjs)$|\.layers\.json$/.test(f));
  if(tr.length)warn('tracked files the package no longer needs: '+tr.join(', '));
}catch(e){warn('git not available')}
for(const f of js){
  const t=rd(f);
  for(const m of t.matchAll(/node\s+([\w.\/-]+\.(?:c|m)?js)/g)){
    const p=path.resolve(path.dirname(f),m[1]);
    if(!fs.existsSync(p))err(f+': calls a script that does not exist: '+m[1]);
  }
}
for(const f of js.concat(['bayda-bin'].filter(x=>fs.existsSync(x)))){
  const t=rd(f);
  for(const m of t.matchAll(/["'](\d+\.\d+\.\d+)["']/g))
    if(pkg&&m[1]!==pkg.version&&/version|ver/i.test(t.slice(Math.max(0,m.index-60),m.index)))warn(f+': hard-coded version '+m[1]+' differs from package.json '+pkg.version);
}
if(pkg&&pkg.bin){
  for(const [n,f] of Object.entries(typeof pkg.bin==='string'?{bin:pkg.bin}:pkg.bin)){
    if(!fs.existsSync(f))continue;
    if(!rd(f).startsWith('#!'))err(n+': '+f+' has no #! first line');
    if(!(fs.statSync(f).mode&0o111))warn(n+': '+f+' is not executable (chmod +x)');
  }
}
const dcodes=rf?[...rd(rf).matchAll(/code:\s*["']([^"']+)["']/g)].map(m=>m[1]):[];
if(fs.existsSync('README.md')){
  const r=rd('README.md');
  if(r.length<500)warn('README.md is very short ('+r.length+' chars)');
  const miss=dcodes.filter(c=>!r.includes(c));
  if(miss.length)warn('README does not mention dialects: '+miss.join(', '));
  if(!/npm (i|install)/.test(r))warn('README has no install instruction');
}else err('README.md missing');
if(!fs.existsSync('LICENSE'))warn('LICENSE missing');
if(pkg&&!pkg.engines)warn('package.json has no "engines" (for example {"node":">=18"})');
const tf=all.filter(f=>/(\.test\.|\.spec\.)/.test(f)||/^tests?[\/\\]/.test(f));
if(!tf.length)warn('no test files');
else if(!tf.some(f=>/transpile/.test(rd(f))))warn('no test covers the transpiler or the bayda command');
const T=require(path.resolve('bayda-transpile.cjs'));
for(const f of df){
  const d=JSON.parse(rd(f)),kw=d.keywords||{},vals=new Set(Object.values(kw)),name=path.basename(f);
  if(d.kind==='vocabulary'){ok(name+': vocabulary file, code checks skipped');continue}
  const miss=[...CORE].filter(c=>!vals.has(c));
  if(miss.length)warn(name+': missing core concepts ('+miss.length+'): '+miss.join(' '));
  for(const [k,v] of Object.entries(kw))if((CORE.has(k)||LIBN.has(k))&&k!==v)err(name+': word "'+k+'" is a JavaScript name but means "'+v+'"');
  const first=(...vs)=>Object.keys(kw).find(k=>vs.includes(kw[k]));
  const fn=first('function'),pr=first('console.log','print','log'),wi=first('if'),wt=first('true'),we=first('else');
  if(fn&&pr&&wi&&wt&&we){
    const src=fn+' f() {\n  '+wi+' ('+wt+') {\n    '+pr+'("x")\n  } '+we+' {\n    '+pr+'("y")\n  }\n}\nf()\n';
    try{
      const out=T(src,f),tmp=path.join(os.tmpdir(),'chk-'+process.pid+'.mjs');
      fs.writeFileSync(tmp,out);
      try{cp.execFileSync(process.execPath,['--check',tmp],{stdio:'pipe'})}catch(x){err(name+': sample program does not compile after translation')}
      fs.unlinkSync(tmp);
    }catch(x){err(name+': transpile threw: '+x.message)}
  }else warn(name+': cannot build a sample program (needs function, print, if, true, else)');
}
if(df[0]){
  const kw0=JSON.parse(rd(df[0])).keywords,w0=Object.keys(kw0)[0];
  const big=Array(20000).fill(w0+'("x") // '+w0).join('\n'),t0=Date.now();
  T(big,df[0]);
  const ms=Date.now()-t0;
  ms>1000?warn('transpile of 20000 lines took '+ms+' ms'):ok('transpile of 20000 lines: '+ms+' ms');
}
if(pkg&&pkg.bin){
  const b=path.resolve(Object.values(typeof pkg.bin==='string'?{x:pkg.bin}:pkg.bin)[0]);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'bayda-chk-'));
  for(const c of dcodes){
    try{
      sh(process.execPath,[b,'init','--dialect',c],{cwd:dir});
      const o=sh(process.execPath,[b,'hello.'+c+'.bayda'],{cwd:dir});
      if(!/hello/.test(o))err('bayda command, dialect '+c+': unexpected output');
    }catch(x){
      const m=String(x.stderr||x.message).split('\n')[0];
      /no function\/print/.test(m)?warn('bayda command, dialect '+c+': '+m):err('bayda command, dialect '+c+' failed: '+m);
    }
  }
  fs.rmSync(dir,{recursive:true,force:true});
  ok('bayda command checked for '+dcodes.length+' dialects');
}
for(const f of all){const z=fs.statSync(f).size;if(z>300000)warn('large file ('+Math.round(z/1024)+' KB): '+f)}

console.log('\n=== '+E+' errors, '+W+' warnings ===');
process.exit(E?1:0);
