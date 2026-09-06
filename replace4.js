const fs = require('fs');
let text = fs.readFileSync('frontend/src/components/admin/PeriodsTab.tsx', 'utf8');

text = text.replace('{React.createElement("ion-icon", { name: "musical-notes-outline" })} Đổi nhạc\n              hàng loạt', '{React.createElement("ion-icon", { name: "musical-notes-outline" })} Đổi nhạc chuông\n              hàng loạt');

text = text.replace('Đổi nhạc hàng loạt', 'Đổi nhạc chuông hàng loạt');

fs.writeFileSync('frontend/src/components/admin/PeriodsTab.tsx', text, 'utf8');