const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/admin/Files.tsx', 'utf8');

code = code.replace(
    /axios\.put\(`\$\{API_URL\}\/api\/files\/move`, \{ fileIds: \[activeFileId\], folderId: targetFolderId \}/,
    "axios.put(`${API_URL}/api/files/${activeFileId}/move`, { folderId: targetFolderId }"
);

fs.writeFileSync('frontend/src/components/admin/Files.tsx', code, 'utf8');
console.log("Done");