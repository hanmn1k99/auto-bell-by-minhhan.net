const fs = require('fs');
let text = fs.readFileSync('frontend/src/components/admin/PeriodsTab.tsx', 'utf8');
let match = text.indexOf('hàng loạt\, "err");');
console.log(text.substring(match - 200, match + 50));