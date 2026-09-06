const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/admin/PeriodsTab.tsx', 'utf8');

const ctxLineMatch = code.match(/const \{[^}]*\} = ctx;/);
if (ctxLineMatch) {
  let ctxLine = ctxLineMatch[0];
  if (!ctxLine.includes('folders')) {
    ctxLine = ctxLine.replace('files,', 'files, folders,');
    code = code.replace(ctxLineMatch[0], ctxLine);
    fs.writeFileSync('frontend/src/components/admin/PeriodsTab.tsx', code, 'utf8');
  }
}