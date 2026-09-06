const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/admin/Files.tsx', 'utf8');
code = code.replace(/-- Chưa phân loại --/g, 'Chưa phân loại');
fs.writeFileSync('frontend/src/components/admin/Files.tsx', code, 'utf8');