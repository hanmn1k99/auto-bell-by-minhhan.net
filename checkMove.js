const fs = require('fs');
let code = fs.readFileSync('backend/src/routes/files.ts', 'utf8');
let uploadIdx = code.indexOf("router.put('/:id/move',");
let nextIdx = code.indexOf("router.delete('/folders/:id',");
console.log(code.substring(uploadIdx, nextIdx));