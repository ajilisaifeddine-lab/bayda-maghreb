const fs = require('fs');
const path = require('path');

// المسارات
const rootPackages = path.join(__dirname, '../packages');
const webLabPackages = path.join(__dirname, '../apps/web-lab/packages');

// 1. Delete old copy if exists
if (fs.existsSync(webLabPackages)) {
    fs.rmSync(webLabPackages, { recursive: true, force: true });
    console.log('🧹 Old web-lab packages removed.');
}

// 2. Copy fresh from root
fs.cpSync(rootPackages, webLabPackages, { recursive: true });
console.log('✅ Packages synced successfully from core to web-lab!');
