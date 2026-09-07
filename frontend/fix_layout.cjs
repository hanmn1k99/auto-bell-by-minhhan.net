const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/admin/Files.tsx', 'utf8');

const folderScrollStartTag = '<div className="folder-list-scroll"';
const cardHeaderStartTag = '<div className="card-header" style={{ flexWrap: \'wrap\', gap: \'0.75rem\', paddingTop: 0 }}>';
const fileListStartTag = '<div className="file-list">';

const p1 = code.indexOf(folderScrollStartTag);
const p2 = code.indexOf(cardHeaderStartTag);
const p3 = code.indexOf(fileListStartTag);

if (p1 !== -1 && p2 !== -1 && p3 !== -1) {
    const beforeFolderScroll = code.substring(0, p1);
    const folderScrollContent = code.substring(p1, p2);
    const cardHeaderContent = code.substring(p2, p3);
    const afterFileList = code.substring(p3);

    // Strip the sticky styles from folderScrollContent
    const cleanFolderScroll = folderScrollContent.replace(
        /style=\{\{ display: 'flex', gap: '0\.5rem', flexWrap: 'wrap', width: 'calc\(100% \+ 3rem\)', margin: '0 -1\.5rem', padding: '1rem 1\.5rem 0\.75rem 1\.5rem', position: 'sticky', top: 0, zIndex: 50, background: '#151923', borderBottom: '1px solid rgba\(255,255,255,0\.08\)', marginBottom: '1rem', boxShadow: '0 4px 10px rgba\(0,0,0,0\.1\)' \}\}/,
        `style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', width: '100%', paddingTop: '0.5rem' }}`
    );

    // Remove the extra </div> at the end of cardHeaderContent that was closing the card
    // Wait, cardHeaderContent ends just before <div className="file-list">
    // Actually, cardHeaderContent is properly closed. It's just a div.
    
    // Create the unified sticky wrapper
    const stickyWrapper = `
          <div style={{ position: 'sticky', top: 0, zIndex: 50, background: '#151923', width: 'calc(100% + 3rem)', margin: '0 -1.5rem', padding: '1.25rem 1.5rem 1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', marginBottom: '1.5rem' }}>
            ${cardHeaderContent}
            ${cleanFolderScroll}
          </div>
          `;

    code = beforeFolderScroll + stickyWrapper + afterFileList;
    fs.writeFileSync('frontend/src/components/admin/Files.tsx', code, 'utf8');
    console.log("Done");
} else {
    console.log("Could not find sections", p1, p2, p3);
}