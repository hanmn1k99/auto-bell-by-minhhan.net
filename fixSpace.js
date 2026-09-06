const fs = require('fs');
let text = fs.readFileSync('frontend/src/components/admin/PeriodsTab.tsx', 'utf8');

text = text.replace(
  '{React.createElement("ion-icon", { name: "musical-notes-outline" })} Đổi nhạc\n              {selectedPeriods.length} {curProfile.itemUnit}',
  '{React.createElement("ion-icon", { name: "musical-notes-outline" })} Đổi nhạc{" "}\n              {selectedPeriods.length} {curProfile.itemUnit}'
);

text = text.replace(
  '{React.createElement("ion-icon", { name: "musical-notes-outline" })} Đổi nhạc\r\n              {selectedPeriods.length} {curProfile.itemUnit}',
  '{React.createElement("ion-icon", { name: "musical-notes-outline" })} Đổi nhạc{" "}\r\n              {selectedPeriods.length} {curProfile.itemUnit}'
);

fs.writeFileSync('frontend/src/components/admin/PeriodsTab.tsx', text, 'utf8');