const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/admin/Files.tsx', 'utf8');

const target = code.match(/\{folders\.map\(folder => \([\s\S]*?<\/div>\s*\)\)\}/);
if (target) {
  let inner = target[0];
  inner = inner.replace(/className="btn btn-sm btn-outline" onClick=\{\(\) => renameFolder/g, 'className={`btn btn-sm ${selectedFolderId === folder.id ? "btn-primary" : "btn-outline"}`} onClick={() => renameFolder');
  inner = inner.replace(/className="btn btn-sm btn-outline" onClick=\{\(\) => deleteFolder/g, 'className={`btn btn-sm ${selectedFolderId === folder.id ? "btn-primary" : "btn-outline"}`} onClick={() => deleteFolder');
  
  code = code.replace(target[0], inner);
  fs.writeFileSync('frontend/src/components/admin/Files.tsx', code, 'utf8');
} else {
  console.log("NOT FOUND");
}