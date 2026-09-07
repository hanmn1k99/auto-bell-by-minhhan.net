const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/admin/Files.tsx', 'utf8');

// Replace the first card-header and folder-list-scroll wrapping
const findHeader = '<div className="card-header" style={{ flexWrap: \'wrap\', gap: \'0.75rem\', borderBottom: \'none\', paddingBottom: \'0.5rem\' }}>';
code = code.replace(findHeader, '');

// Since we removed the wrapper, we need to remove its closing `</div>` which is before the second `card-header`.
const findSecondHeader = '<div className="card-header" style={{ flexWrap: \'wrap\', gap: \'0.75rem\', paddingTop: 0 }}>';
code = code.replace('</div>\n          <div className="card-header" style={{ flexWrap: \'wrap\', gap: \'0.75rem\', paddingTop: 0 }}>', findSecondHeader);

// Now update the folder-list-scroll
const oldScroll = `<div className="folder-list-scroll" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', width: '100%', paddingBottom: '0.5rem', position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg)', paddingTop: '0.5rem' }}>`;
const newScroll = `<div className="folder-list-scroll" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', width: '100%', padding: '1rem 0 0.5rem 0', position: 'sticky', top: 0, zIndex: 20, background: 'var(--card-bg)', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '0.5rem' }}>`;

if (code.includes(oldScroll)) {
    code = code.replace(oldScroll, newScroll);
} else {
    // maybe it has different spaces
    const regex = /<div className="folder-list-scroll".*?position: 'sticky'.*?>/;
    code = code.replace(regex, newScroll);
}

fs.writeFileSync('frontend/src/components/admin/Files.tsx', code, 'utf8');
console.log("Done");