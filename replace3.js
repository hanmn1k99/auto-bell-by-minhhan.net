const fs = require('fs');
let text = fs.readFileSync('frontend/src/components/admin/PeriodsTab.tsx', 'utf8');

let lines = text.split('\n');
for (let i=0; i<lines.length; i++) {
  if (lines[i].includes('name: "pencil-outline"') && lines[i+3] && lines[i+3].includes('Sửa hàng loạt')) {
    lines[i] = lines[i].replace('pencil-outline', 'musical-notes-outline');
    lines[i+3] = lines[i+3].replace('Sửa hàng loạt', 'Đổi nhạc hàng loạt');
  }
}

fs.writeFileSync('frontend/src/components/admin/PeriodsTab.tsx', lines.join('\n'), 'utf8');