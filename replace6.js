const fs = require('fs');
let text = fs.readFileSync('frontend/src/components/admin/PeriodsTab.tsx', 'utf8');

text = text.replace('Đổi nhạc chuông hàng loạt', 'Đổi nhạc chuông');

fs.writeFileSync('frontend/src/components/admin/PeriodsTab.tsx', text, 'utf8');