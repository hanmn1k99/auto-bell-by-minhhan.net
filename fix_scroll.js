const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/admin/Files.tsx', 'utf8');

code = code.replace(
    /className="folder-list-scroll" style=\{\{ display: 'flex', gap: '0\.5rem', overflowX: 'auto', width: '100%', paddingBottom: '0\.5rem', WebkitOverflowScrolling: 'touch' \}\}/g,
    `className="folder-list-scroll" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', width: '100%', paddingBottom: '0.5rem' }}`
);

fs.writeFileSync('frontend/src/components/admin/Files.tsx', code, 'utf8');
console.log("Done");