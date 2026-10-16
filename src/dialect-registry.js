import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PACKAGES_ROOT = path.join(__dirname, '..', 'packages');
function loadDialects() {
  const map = {};
  const dirs = fs.readdirSync(PACKAGES_ROOT, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name);
  for (const dir of dirs) {
    const mf = path.join(PACKAGES_ROOT, dir, 'manifest.json');
    if (fs.existsSync(mf)) {
      const manifest = JSON.parse(fs.readFileSync(mf, 'utf8'));
      map[dir] = { id: manifest.id || dir,...manifest };
    }
  }
  return map;
}
export const DIALECTS = loadDialects();
const ALIASES = {
  "tounsi": "tn-latn",
  "tn": "tn-latn",
  "tunisia_franco": "tn-latn",
  "algeria_franco": "dz-latn",
  "dz": "dz-latn",
  "kabyle": "kab-latn",
  "kabyle-latin": "kab-latn",
  "kab": "kab-latn",
  "libya": "ly-latn",
  "ly": "ly-latn",
  "mauritania": "mr-latn",
  "mr": "mr-latn"
};
export function resolveDialect(input) {
  let clean = String(input).toLowerCase().trim().replace(/^.*hello\./, '').replace(/\.bayda$/, '').replace(/^\./, '');
  if (DIALECTS[clean]) return DIALECTS[clean].id || clean;
  if (ALIASES[clean]) return ALIASES[clean];
  return clean;
}
export function getDialect(code = "tn-latn") {
  const resolved = resolveDialect(code);
  return DIALECTS[resolved] || null;
}
export function getAllDialects() {
  return Object.values(DIALECTS);
}
export default { DIALECTS, resolveDialect, getDialect, getAllDialects };
