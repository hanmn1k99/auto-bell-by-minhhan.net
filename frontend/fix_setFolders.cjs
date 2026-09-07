const fs = require('fs');
let admin = fs.readFileSync('frontend/src/AdminPage.tsx', 'utf8');
admin = admin.replace('folders, API_URL,', 'folders, setFolders, API_URL,');
fs.writeFileSync('frontend/src/AdminPage.tsx', admin, 'utf8');

let files = fs.readFileSync('frontend/src/components/admin/Files.tsx', 'utf8');
files = files.replace('folders, API_URL,', 'folders, setFolders, API_URL,');
fs.writeFileSync('frontend/src/components/admin/Files.tsx', files, 'utf8');
console.log("Done");