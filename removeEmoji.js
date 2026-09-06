const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/admin/Schedules.tsx', 'utf8');

const oldRegex = /<option value="folder_null" style=\{\{color: 'var\(--accent\)', fontWeight: 'bold'\}\}>➕ \[Thêm tất cả\] Chưa phân loại<\/option>/g;
const newRegex = `<option value="folder_null" style={{color: 'var(--accent)', fontWeight: 'bold'}}>-- Thêm toàn bộ thư mục --</option>`;
code = code.replace(oldRegex, newRegex);

const oldRegex2 = /<option value=\{\`folder_\$\{folder\.id\}\`\} style=\{\{color: 'var\(--accent\)', fontWeight: 'bold'\}\}>➕ \[Thêm tất cả\] \{folder\.name\}<\/option>/g;
const newRegex2 = `<option value={\`folder_\${folder.id}\`} style={{color: 'var(--accent)', fontWeight: 'bold'}}>-- Thêm toàn bộ thư mục --</option>`;
code = code.replace(oldRegex2, newRegex2);

fs.writeFileSync('frontend/src/components/admin/Schedules.tsx', code, 'utf8');