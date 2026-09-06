const fs = require('fs');

function fixImport(file) {
  let code = fs.readFileSync(file, 'utf8');
  if (!code.includes("import { CustomSelect }")) {
    code = code.replace(/import React.*?from ['"]react['"];/, match => match + "\nimport { CustomSelect } from './CustomSelect';");
    fs.writeFileSync(file, code, 'utf8');
  }
}

fixImport('frontend/src/components/admin/Files.tsx');
fixImport('frontend/src/components/admin/PeriodsTab.tsx');
fixImport('frontend/src/components/admin/Users.tsx');
fixImport('frontend/src/components/admin/Departments.tsx');

let code = fs.readFileSync('frontend/src/components/admin/PeriodsTab.tsx', 'utf8');
// Fix folders missing in bulkEditAudioNew
// Wait, why is folders not found? Let's check where it is destructured.
// It is destructured as `const { ..., files, ... } = ctx;`
// Wait, is folders destructured in PeriodsTab?
if (!code.includes("folders,") && !code.includes(" folders ")) {
  code = code.replace("fetchFiles, API_URL", "fetchFiles, folders, API_URL");
}
fs.writeFileSync('frontend/src/components/admin/PeriodsTab.tsx', code, 'utf8');
