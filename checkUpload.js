const fs = require('fs');
let code = fs.readFileSync('backend/src/routes/files.ts', 'utf8');
let uploadIdx = code.indexOf("router.post('/upload',");
let nextIdx = code.indexOf("router.post('/upload-logo',");
console.log(code.substring(uploadIdx, nextIdx));