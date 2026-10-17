const fs = require('fs');
const path = require('path');

const packagesDir = path.join(process.cwd(), 'packages');
if (!fs.existsSync(packagesDir)) {
    console.error("❌ مجلد packages غير موجود!");
    process.exit(1);
}

const dirs = fs.readdirSync(packagesDir).filter(f => fs.statSync(path.join(packagesDir, f)).isDirectory());

console.log("==================================================");
console.log("📦 الفحص النهائي لحزم اللهجات");
console.log("==================================================");

let totalKeywords = 0;
let totalVocab = 0;

dirs.forEach(dir => {
    const pkgDir = path.join(packagesDir, dir);
    const manifestPath = path.join(pkgDir, 'manifest.json');
    const keywordsPath = path.join(pkgDir, 'keywords.json');
    const vocabPath = path.join(pkgDir, 'vocabulary.json');
    const symbolsPath = path.join(pkgDir, 'symbols.json');
    
    try {
        if (!fs.existsSync(manifestPath)) throw new Error("ينقصه manifest.json");
        if (!fs.existsSync(keywordsPath)) throw new Error("ينقصه keywords.json");
        
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        const keywords = JSON.parse(fs.readFileSync(keywordsPath, 'utf8'));
        const vocab = fs.existsSync(vocabPath) ? JSON.parse(fs.readFileSync(vocabPath, 'utf8')) : {};
        const syms = fs.existsSync(symbolsPath) ? "موجود" : "غير موجود";
        
        const kwCount = Object.keys(keywords).length;
        const vocabCount = Object.keys(vocab).length;
        
        totalKeywords += kwCount;
        totalVocab += vocabCount;
        
        console.log(`\n✅ ${dir}`);
        console.log(`   ID: ${manifest.id} | Name: ${manifest.name}`);
        console.log(`   Script: ${manifest.script || 'N/A'} | Consent: ${manifest.requiresConsent}`);
        console.log(`   Keywords: ${kwCount} | Vocabulary: ${vocabCount} | Symbols: ${syms}`);
        
    } catch (e) {
        console.error(`❌ ${dir} | خطأ: ${e.message}`);
    }
});

console.log("\n==================================================");
console.log(`📊 الإجمالي: ${dirs.length} حزمة`);
console.log(`🔑 إجمالي الكلمات البرمجية: ${totalKeywords}`);
console.log(`📖 إجمالي المفردات: ${totalVocab}`);
console.log("==================================================");
