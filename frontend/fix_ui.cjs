const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/admin/Files.tsx', 'utf8');

// The current folder-list-scroll is:
// <div className="folder-list-scroll" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', width: '100%', padding: '1rem 0 0.5rem 0', position: 'sticky', top: 0, zIndex: 20, background: 'var(--card-bg)', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '0.5rem' }}>

code = code.replace(
    /className="folder-list-scroll" style=\{\{ display: 'flex', gap: '0\.5rem', flexWrap: 'wrap', width: '100%', padding: '1rem 0 0\.5rem 0', position: 'sticky', top: 0, zIndex: 20, background: 'var\(--card-bg\)', borderBottom: '1px solid rgba\(255,255,255,0\.05\)', marginBottom: '0\.5rem' \}\}/,
    `className="folder-list-scroll" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', width: 'calc(100% + 3rem)', margin: '0 -1.5rem', padding: '1rem 1.5rem 0.75rem 1.5rem', position: 'sticky', top: 0, zIndex: 50, background: '#151923', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: '1rem', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}`
);

fs.writeFileSync('frontend/src/components/admin/Files.tsx', code, 'utf8');
console.log("Done");