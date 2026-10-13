import fs from 'fs';
const data = JSON.parse(fs.readFileSync('./dialects/mauritania.json','utf8'));
console.log('✅ Mauritania loaded:', data.code, '-', Object.keys(data.keywords).length, 'words');
console.log('Example: deploy =>', data.keywords.deploy);
console.log('Example: bug_fix =>', data.keywords.bug_fix);
