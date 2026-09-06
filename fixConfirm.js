const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/admin/Schedules.tsx', 'utf8');

code = code.replace(/if \(!window\.confirm\('Xóa bài này khỏi lịch\?'\)\) return;/, "if (!(await customConfirm('Xóa bài này khỏi lịch?'))) return;");
fs.writeFileSync('frontend/src/components/admin/Schedules.tsx', code, 'utf8');