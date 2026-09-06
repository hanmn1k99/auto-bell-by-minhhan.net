const fs = require('fs');
let code = fs.readFileSync('frontend/src/AdminPage.tsx', 'utf8');
code = code.replace(/Kho Lưu Trữ/g, 'Media');
fs.writeFileSync('frontend/src/AdminPage.tsx', code, 'utf8');