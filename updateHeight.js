const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/admin/CustomSelect.tsx', 'utf8');

code = code.replace(/maxHeight = "250px"/, 'maxHeight = "400px"');
fs.writeFileSync('frontend/src/components/admin/CustomSelect.tsx', code, 'utf8');