const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/admin/Files.tsx', 'utf8');

const regex = /<div style=\{\{ display: 'flex', gap: '0\.5rem', overflowX: 'auto', width: '100%', paddingBottom: '0\.5rem' \}\}>/;
const newRegex = `<div className="folder-list-scroll" style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', width: '100%', paddingBottom: '0.5rem', WebkitOverflowScrolling: 'touch' }}>`;
code = code.replace(regex, newRegex);

code = code.replace(/style=\{\{ whiteSpace: 'nowrap' \}\}/g, `style={{ whiteSpace: 'nowrap', flexShrink: 0 }}`);
code = code.replace(/style=\{\{ whiteSpace: 'nowrap', borderRight: 'none', borderTopRightRadius: 0, borderBottomRightRadius: 0 \}\}/g, `style={{ whiteSpace: 'nowrap', borderRight: 'none', borderTopRightRadius: 0, borderBottomRightRadius: 0, flexShrink: 0 }}`);
code = code.replace(/style=\{\{ whiteSpace: 'nowrap', borderStyle: 'dashed' \}\}/g, `style={{ whiteSpace: 'nowrap', borderStyle: 'dashed', flexShrink: 0 }}`);
code = code.replace(/style=\{\{ display: 'flex', gap: '2px' \}\}/g, `style={{ display: 'flex', gap: '2px', flexShrink: 0 }}`);

fs.writeFileSync('frontend/src/components/admin/Files.tsx', code, 'utf8');