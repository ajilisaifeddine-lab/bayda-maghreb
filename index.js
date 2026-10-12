import fs from 'fs';
import { dialects } from './src/dialect-registry.js';

function load(entry) {
  const dialect = JSON.parse(fs.readFileSync(`./data/dialects/${entry.file}`, 'utf8'));
  const problems = [];
  if (dialect.code!== entry.code) problems.push(`code في الملف (${dialect.code}) لا يطابق السجل (${entry.code})`);
  if (!dialect.name) problems.push('name مفقود');
  if (!dialect.script) problems.push('script مفقود');
  const kw = dialect.keywords;
  if (!kw || typeof kw!== 'object' ||!Object.keys(kw).length) problems.push('keywords فارغة أو مفقودة');
  else for (const [word, target] of Object.entries(kw)) {
    if (!/^[\p{L}\p{M}\p{N}_ ]+$/u.test(word)) problems.push(`كلمة غير مقبولة: ${word}`);
    if (typeof target!== 'string' ||!target) problems.push(`هدف غير صالح: ${word}`);
  }
  return { dialect, problems };
}

const arg = process.argv[2] || 'kab';
if (arg === '--test') {
  let bad = 0;
  for (const e of dialects) {
    try {
      const { problems } = load(e);
      console.log(problems.length? `❌ ${e.code}` : `✅ ${e.code}`);
      problems.forEach(p => console.log(' -', p));
      bad += problems.length;
    } catch (err) { console.log(`❌ ${e.code}: ${err.message}`); bad++; }
  }
  process.exit(bad? 1 : 0);
}
const entry = dialects.find(d => d.code === arg);
if (!entry) { console.error(`❌ لهجة غير معروفة: ${arg}\nالمتاح: ${dialects.map(d => d.code).join(', ')}`); process.exit(1); }
try {
  const { dialect, problems } = load(entry);
  console.log(`✅ تم تحميل لهجة: ${dialect.name}`);
  console.log('الكلمات:', Object.keys(dialect.keywords).slice(0, 5));
  problems.forEach(p => console.error('⚠️', p));
} catch (e) { console.error('❌ خطأ:', e.message); process.exit(1); }
