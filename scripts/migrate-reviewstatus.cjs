// ينقل reviewStatus من keywords.json إلى manifest.json (بيانات وصفية لا كلمات برمجية)
const fs = require('fs');
const path = require('path');

const packagesDir = path.join(__dirname, '../packages');
const dirs = fs.readdirSync(packagesDir).filter(f => fs.statSync(path.join(packagesDir, f)).isDirectory());

let moved = 0;
for (const dir of dirs) {
  const kwPath = path.join(packagesDir, dir, 'keywords.json');
  const mfPath = path.join(packagesDir, dir, 'manifest.json');
  if (!fs.existsSync(kwPath) || !fs.existsSync(mfPath)) continue;

  const kw = JSON.parse(fs.readFileSync(kwPath, 'utf8'));
  if (!('reviewStatus' in kw)) continue;

  const status = kw.reviewStatus;
  delete kw.reviewStatus;

  const mf = JSON.parse(fs.readFileSync(mfPath, 'utf8'));
  if (!('reviewStatus' in mf)) mf.reviewStatus = status;

  fs.writeFileSync(kwPath, JSON.stringify(kw, null, 2) + '\n', 'utf8');
  fs.writeFileSync(mfPath, JSON.stringify(mf, null, 2) + '\n', 'utf8');
  console.log(`✅ ${dir}: reviewStatus -> manifest (${status})`);
  moved++;
}
console.log(`Done. ${moved} package(s) updated.`);
