const fs = require('fs');
let code = fs.readFileSync('backend/src/routes/files.ts', 'utf8');

// Fix PUT /api/files/:id/move
const badPathRegex = /const oldPhysicalPath = path\.join\(__dirname, '\.\.\/\.\.\/', decodeURIComponent\(relPath\)\);/g;
const newPathStr = `const oldPhysicalPath = path.join(UPLOADS_DIR, path.basename(decodeURIComponent(relPath)));`;

code = code.replace(badPathRegex, newPathStr);

// Fix POST /api/files/upload
const badUploadPathRegex = /const oldPhysicalPath = path\.join\(UPLOADS_DIR, file\.filename\);[\s\S]*?if \(fs\.existsSync\(oldPhysicalPath\)\) \{[\s\S]*?fs\.renameSync\(oldPhysicalPath, newPhysicalPath\);[\s\S]*?\}/;
// Actually POST /upload uses `oldPhysicalPath = path.join(UPLOADS_DIR, file.filename)` which is correct.
// Let's check DELETE /folders/:id
const deleteFolderBadRegex = /const currentPhysicalPath = path\.join\(UPLOADS_DIR, folder\.name, fileName\);/g;
// Actually, DELETE folder is correct. 

// Is there any other `path.join(__dirname, '../../'` ?
code = code.replace(/path\.join\(__dirname, '\.\.\/\.\.\/', decodeURIComponent\(relPath\)\)/g, 'path.join(UPLOADS_DIR, path.basename(decodeURIComponent(relPath)))');
code = code.replace(/path\.join\(__dirname, '\.\.\/\.\.\/',/g, "path.join(UPLOADS_DIR, "); // Catch any others?

fs.writeFileSync('backend/src/routes/files.ts', code, 'utf8');