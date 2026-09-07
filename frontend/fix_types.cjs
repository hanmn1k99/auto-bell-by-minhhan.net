const fs = require('fs');
let files = fs.readFileSync('frontend/src/components/admin/Files.tsx', 'utf8');
files = files.replace('const newFolders = arrayMove(folders, oldIndex, newIndex);', 'const newFolders = arrayMove(folders, oldIndex, newIndex) as any[];');
fs.writeFileSync('frontend/src/components/admin/Files.tsx', files, 'utf8');
console.log("Done");