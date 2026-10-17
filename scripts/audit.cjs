const fs = require('fs');
const path = require('path');

const packagesDir = path.join(process.cwd(), 'packages');
if (!fs.existsSync(packagesDir)) {
    console.error("❌ مجلد packages غير موجود!");
    process.exit(1);
}

const dirs = fs.readdirSync(packagesDir).filter(f => fs.statSync(path.join(packagesDir, f)).isDirectory());
let successCount = 0;
let errorCount = 0;

console.log("==================================================");
console.log("📦 تدقيق حزم اللهجات في bayda-maghreb");
console.log("==================================================");

dirs.forEach(dir => {
    const pkgDir = path.join(packagesDir, dir);
    const manifestPath = path.join(pkgDir, 'manifest.json');
    const keywordsPath = path.join(pkgDir, 'keywords.json');
    
    try {
        if (!fs.existsSync(manifestPath)) throw new Error("ينقصه manifest.json");
        if (!fs.existsSync(keywordsPath)) throw new Error("ينقصه keywords.json");
        
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        const keywords = JSON.parse(fs.readFileSync(keywordsPath, 'utf8'));
        
        const id = manifest.id || '❌ لا يوجد ID';
        const name = manifest.name || '❌ لا يوجد Name';
        const count = Object.keys(keywords).length;
        
        console.log(`✅ ${dir.padEnd(15)} | ID: ${id.padEnd(15)} | Words: ${count}`);
        successCount++;
    } catch (e) {
        console.error(`❌ ${dir.padEnd(15)} | خطأ: ${e.message}`);
        errorCount++;
    }
});

console.log("==================================================");
console.log(`تم فحص ${dirs.length} حزمة. الناجحة: ${successCount} | الفاشلة: ${errorCount}`);
if (errorCount > 0) process.exit(1);
