const fs = require('fs');
let text = fs.readFileSync('frontend/src/components/admin/PeriodsTab.tsx', 'utf8');

text = text.replace('{React.createElement("ion-icon", { name: "musical-notes-outline" })} Đổi nhạc', '{React.createElement("ion-icon", { name: "musical-notes-outline" })} Đổi nhạc chuông');

fs.writeFileSync('frontend/src/components/admin/PeriodsTab.tsx', text, 'utf8');