const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/admin/Files.tsx', 'utf8');

const regex = /<button className=\{"btn btn-sm "\s*\+\s*\(selectedFolderId === folder\.id \? 'btn-primary' : 'btn-outline'\)\} onClick=\{\(\) => setSelectedFolderId\(folder\.id\)\} style=\{\{ whiteSpace: 'nowrap', borderRight: 'none', borderTopRightRadius: 0, borderBottomRightRadius: 0, flexShrink: 0 \}\}>\s*\{React\.createElement\('ion-icon', \{ name: 'folder' \}\)\} \{folder\.name\}\s*<\/button>\s*<button className="btn btn-sm btn-outline" onClick=\{\(\) => renameFolder\(folder\.id, folder\.name\)\} style=\{\{ padding: '0 5px', borderRadius: 0, borderLeft: 'none', borderRight: 'none' \}\} title="? i tAn">\{React\.createElement\('ion-icon', \{ name: 'pencil' \}\)\}<\/button>\s*<button className="btn btn-sm btn-outline" onClick=\{\(\) => deleteFolder\(folder\.id\)\} style=\{\{ padding: '0 5px', borderTopLeftRadius: 0, borderBottomLeftRadius: 0, borderLeft: 'none' \}\} title="XA3a">\{React\.createElement\('ion-icon', \{ name: 'trash' \}\)\}<\/button>/;

// Wait, doing string replacement on this might be tricky because of encoding.
// Let's use node to carefully replace it.