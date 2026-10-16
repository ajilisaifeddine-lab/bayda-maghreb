import fs from 'fs';
import path from 'path';

const PACKAGES_ROOT = path.join(process.cwd(), 'packages');

// يقرا الفولدرات طول - ما عادش hard-coded
function loadDialects() {
  const dialects = {};
  try {
    const dirs = fs.readdirSync(PACKAGES_ROOT, { withFileTypes: true })
     .filter(d => d.isDirectory())
     .map(d => d.name);

    for (const dir of dirs) {
      const manifestPath = path.join(PACKAGES_ROOT, dir, 'manifest.json');
      if (fs.existsSync(manifestPath)) {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        const code = manifest.id || dir;
        // code هو نفسه اسم الفولدر توة: tn-latn, kab-latn...
        dialects[code] = manifest;
        // زيد alias للاسم القديم باش ما يتكسرش
        if (dir!== code) dialects[dir] = manifest;
      }
    }
  } catch {}
  return dialects;
}

const DIALECTS = loadDialects();

// aliases إضافية للتوافق
const ALIASES = {
  "tounsi": "tn-latn", "tn": "tn-latn", "tunisia_franco": "tn-latn",
  "kab": "kab-latn", "kab-lat": "kab-latn", "kabyle": "kab-latn",
  "ly": "ly-latn", "libya": "ly-latn", "libya.franko": "ly-latn",
  "dz": "dz-latn", "dzair": "dz-latn",
  "mr": "mr-latn", "hassani": "mr-latn", "mauritania": "mr-latn",
  "mauritania.franko": "mr-latn"
};

export function resolveDialect(input) {
  let clean = String(input).toLowerCase().trim()
   .replace(/^.*hello\./, '') // hello.kab-latn.bayda -> kab-latn.bayda
   .replace(/\.bayda$/, '')
   .replace(/^\./, '');

  // مباشر
  if (DIALECTS[clean]) return DIALECTS[clean].id || clean;
  // alias
  if (ALIASES[clean]) return ALIASES[clean];
  // جرب يلقى فولدر
  if (fs.existsSync(path.join(PACKAGES_ROOT, clean))) return clean;

  throw new Error(`unknown dialect: ${clean} (${Object.keys({...DIALECTS,...ALIASES}).join(', ')})`);
}

export function getDialect(code) {
  const resolved = resolveDialect(code);
  return DIALECTS[resolved];
}

export default { resolveDialect, getDialect, DIALECTS };
