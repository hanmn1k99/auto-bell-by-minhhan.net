const fs = require('fs');
let text = fs.readFileSync('frontend/src/components/admin/SystemTab.tsx', 'utf8');

const startStr = '          {/* Hàng 2: Thẻ Cấu hình Sound Card & Simulator (Toàn Chiều rộng Full-Width) */}';
const endStr = '          </div>\n        </div>\n      )}\n\n      {systemSubTab === \\'users\\' && <Users />}';

const startIdx = text.indexOf(startStr);
const endIdx = text.indexOf(endStr);

if (startIdx !== -1 && endIdx !== -1) {
  text = text.substring(0, startIdx) + '        </div>\n      )}\n\n      {systemSubTab === \\'users\\' && <Users />}' + text.substring(endIdx + endStr.length);
  fs.writeFileSync('frontend/src/components/admin/SystemTab.tsx', text, 'utf8');
  console.log('Replaced successfully');
} else {
  console.log('Not found', startIdx, endIdx);
}