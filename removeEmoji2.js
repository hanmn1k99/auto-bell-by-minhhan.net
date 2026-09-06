const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/admin/Schedules.tsx', 'utf8');

const regex1 = /<option value="folder_null" style=\{\{color: 'var\(--accent\)', fontWeight: 'bold'\}\}>[\s\S]*?<\/option>/g;
const newRegex1 = `<option value="folder_null" style={{color: 'var(--accent)', fontWeight: 'bold'}}>-- Thêm toàn bộ thư mục --</option>`;
code = code.replace(regex1, newRegex1);

const regex2 = /<option value=\{\`folder_\$\{folder\.id\}\`\} style=\{\{color: 'var\(--accent\)', fontWeight: 'bold'\}\}>[\s\S]*?<\/option>/g;
const newRegex2 = `<option value={\`folder_\${folder.id}\`} style={{color: 'var(--accent)', fontWeight: 'bold'}}>-- Thêm toàn bộ thư mục --</option>`;
code = code.replace(regex2, newRegex2);

fs.writeFileSync('frontend/src/components/admin/Schedules.tsx', code, 'utf8');