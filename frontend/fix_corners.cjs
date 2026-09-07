const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/admin/Files.tsx', 'utf8');

// The current sticky wrapper:
// <div style={{ position: 'sticky', top: 0, zIndex: 50, background: '#151923', width: 'calc(100% + 3rem)', margin: '0 -1.5rem', padding: '1.25rem 1.5rem 1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', marginBottom: '1.5rem' }}>

code = code.replace(
    /style=\{\{ position: 'sticky', top: 0, zIndex: 50, background: '#151923', width: 'calc\(100% \+ 3rem\)', margin: '0 -1\.5rem', padding: '1\.25rem 1\.5rem 1rem 1\.5rem', borderBottom: '1px solid rgba\(255,255,255,0\.08\)', boxShadow: '0 4px 10px rgba\(0,0,0,0\.1\)', marginBottom: '1\.5rem' \}\}/,
    `style={{ position: 'sticky', top: '-1px', zIndex: 50, background: '#151923', width: 'calc(100% + 3rem)', margin: '-1.25rem -1.5rem 0 -1.5rem', padding: '1.25rem 1.5rem 1rem 1.5rem', borderTopLeftRadius: '15px', borderTopRightRadius: '15px', borderBottom: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', marginBottom: '1.5rem' }}`
);

fs.writeFileSync('frontend/src/components/admin/Files.tsx', code, 'utf8');
console.log("Done");