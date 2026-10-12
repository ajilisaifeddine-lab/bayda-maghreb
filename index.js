import fs from 'fs';
import { dialects } from './src/dialect-registry.js';
function load(entry) {
  const data = fs.readFileSync(`./data/dialects/${entry.file}`, 'utf8');
  const dialect = JSON.parse(data);
  return dialect;
}
const arg = process.argv[2] || '--test';
if (arg === '--test') {
  for (const e of dialects) {
    try {
      const d = load(e);
      console.log(`✅ ${e.code} - ${d.name}`);
    } catch (err) {
      console.log(`❌ ${e.code}: ${err.message}`);
    }
  }
}
