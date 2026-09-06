const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/admin/Files.tsx', 'utf8');

// Remove the `!isCollapsed &&` condition and the `onClick` handler that toggles it.
// We can just keep the `collapsedFolders` state unused or remove it. We'll just replace the conditional rendering.

code = code.replace(/\{!isCollapsed && \(\s*<div style=\{\{ padding: '0\.5rem' \}\}>\s*\{folderFiles\.map\(renderFile\)\}\s*<\/div>\s*\)\}/g, `<div style={{ padding: '0.5rem' }}>\n                          {folderFiles.map(renderFile)}\n                        </div>`);

code = code.replace(/\{!isCollapsed && \(\s*<div style=\{\{ padding: '0\.5rem' \}\}>\s*\{unassignedFiles\.map\(renderFile\)\}\s*<\/div>\s*\)\}/g, `<div style={{ padding: '0.5rem' }}>\n                          {unassignedFiles.map(renderFile)}\n                        </div>`);

// Also change the chevron icon to something else like a fixed folder icon or just remove the cursor pointer on the header.
// Or replace `chevron-forward-outline` / `chevron-down-outline` logic with just nothing or just folder-open.

code = code.replace(/\{React\.createElement\('ion-icon', \{ name: isCollapsed \? 'chevron-forward-outline' : 'chevron-down-outline', style: \{ color: 'var\(--text-muted\)' \} \}\)\}/g, "");

// Remove pointer cursor from header
code = code.replace(/cursor: 'pointer',/g, "");
code = code.replace(/onClick=\{.*?toggleFolderCollapse.*?\}/g, "");

fs.writeFileSync('frontend/src/components/admin/Files.tsx', code, 'utf8');
console.log("Done");