import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import fs from 'fs';
import { dialects } from './src/dialect-registry.js';

function load(entry) {
  const p = path.join(__dirname, 'data/dialects', entry.file);
  const dialect = JSON.parse(fs.readFileSync(p, 'utf8'));
  const problems = [];
  if (dialect.code!== entry.code) problems.push(`code mismatch`);
  if (!dialect.name) problems.push('name missing');
  if (!dialect.script) problems.push('script missing');
  if (!dialect.keywords ||!Object.keys(dialect.keywords).length) problems.push('keywords empty');
  return { dialect, problems };
}

const arg = process.argv[2] || 'kab';
if (arg === '--test') {
  let bad = 0;
  for (const e of dialects) {
    try {
      const { problems } = load(e);
      console.log(problems.length? `❌ ${e.code}` : `✅ ${e.code}`);
      if(problems.length) bad++;
    } catch (err) { console.log(`❌ ${e.code}: ${err.message}`); bad++; }
  }
  process.exit(bad? 1 : 0);
}
const entry = dialects.find(d => d.code === arg);
if (!entry) { console.error(`❌ ${arg} not found`); process.exit(1); }
const { dialect } = load(entry);
console.log(`✅ loaded: ${dialect.name} - ${Object.keys(dialect.keywords).length} words`);
