const fs = require('fs');
let text = fs.readFileSync('frontend/src/components/admin/SystemTab.tsx', 'utf8');

const search = '          {/* Hàng 2: Thẻ Cấu hình Sound Card & Simulator (Toàn Chiều rộng Full-Width) */}';
const startIndex = text.indexOf(search);

const searchEnd = '        </div>\n      )}\n\n      {systemSubTab === \\'users\\' && <Users />}';
const endIndex = text.indexOf(searchEnd, startIndex);

if (startIndex !== -1 && endIndex !== -1) {
  text = text.substring(0, startIndex) + searchEnd + text.substring(endIndex + searchEnd.length);
  fs.writeFileSync('frontend/src/components/admin/SystemTab.tsx', text, 'utf8');
} else {
  console.log('Not found', startIndex, endIndex);
}