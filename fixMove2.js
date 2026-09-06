const fs = require('fs');
let code = fs.readFileSync('backend/src/routes/files.ts', 'utf8');

const correctLogic = `
    let oldPhysicalPath = '';
    const decodedDbPath = decodeURIComponent(file.path);
    if (decodedDbPath.startsWith('/uploads/')) {
      const subPath = decodedDbPath.substring('/uploads/'.length);
      oldPhysicalPath = path.join(UPLOADS_DIR, subPath);
    } else {
      oldPhysicalPath = path.join(UPLOADS_DIR, path.basename(decodedDbPath));
    }
`;

const badLogicRegex = /\/\/ Determine old physical path carefully from DB path[\s\S]*?const oldPhysicalPath = [^\n]*;/;
code = code.replace(badLogicRegex, correctLogic.trim());

fs.writeFileSync('backend/src/routes/files.ts', code, 'utf8');