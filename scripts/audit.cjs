const fs = require('fs');
const path = require('path');

// استدعاء ملف النصوص
const messages = JSON.parse(fs.readFileSync(path.join(__dirname, 'messages.json'), 'utf8'));

const packagesDir = path.join(process.cwd(), 'packages');
if (!fs.existsSync(packagesDir)) {
    console.error(messages.missingPackages);
    process.exit(1);
}

const dirs = fs.readdirSync(packagesDir).filter(f => fs.statSync(path.join(packagesDir, f)).isDirectory());
let successCount = 0;
let errorCount = 0;
let totalKeywords = 0;
let totalVocab = 0;

console.log(messages.header);
console.log(messages.title);
console.log(messages.header);

dirs.forEach(dir => {
    const pkgDir = path.join(packagesDir, dir);
    const manifestPath = path.join(pkgDir, 'manifest.json');
    const keywordsPath = path.join(pkgDir, 'keywords.json');
    const vocabPath = path.join(pkgDir, 'vocabulary.json');
    
    try {
        if (!fs.existsSync(manifestPath)) throw new Error(messages.missingManifest);
        if (!fs.existsSync(keywordsPath)) throw new Error(messages.missingKeywords);
        
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        const keywords = JSON.parse(fs.readFileSync(keywordsPath, 'utf8'));
        const vocab = fs.existsSync(vocabPath) ? JSON.parse(fs.readFileSync(vocabPath, 'utf8')) : {};
        
        const kwCount = Object.keys(keywords).length;
        const vocabCount = Object.keys(vocab).length;
        
        totalKeywords += kwCount;
        totalVocab += vocabCount;
        
        console.log(`${messages.success} ${dir.padEnd(15)} | ID: ${manifest.id.padEnd(15)} | Keywords: ${kwCount.toString().padEnd(4)} | Vocabulary: ${vocabCount}`);
        successCount++;
    } catch (e) {
        console.error(`${messages.error} ${dir.padEnd(15)} | ${e.message}`);
        errorCount++;
    }
});

console.log(messages.header);
console.log(`${messages.summary}: ${dirs.length} ${messages.packagesCount} | ${messages.successCount}: ${successCount} | ${messages.errorCount}: ${errorCount}`);
console.log(`${messages.totalKeywords}: ${totalKeywords}`);
console.log(`${messages.totalVocab}: ${totalVocab}`);
console.log(messages.header);
if (errorCount > 0) process.exit(1);
