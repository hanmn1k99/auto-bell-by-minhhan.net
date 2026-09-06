const fs = require('fs');
let code = fs.readFileSync('backend/src/routes/schedules.ts', 'utf8');

code = code.replace(/targetDevices: originalSch\.targetDevices,\s*soundCardId: originalSch\.soundCardId,/, '');
fs.writeFileSync('backend/src/routes/schedules.ts', code, 'utf8');