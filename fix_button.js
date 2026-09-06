const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/admin/Files.tsx', 'utf8');

const startIndex = code.indexOf('{folders.map(folder => (');
const endIndex = code.indexOf('))}', startIndex) + 3;

if (startIndex !== -1 && endIndex !== -1) {
    const chunk = code.substring(startIndex, endIndex);
    if (chunk.includes('borderRight: \'none\'')) { // Make sure it's the right one
        const newString = `{folders.map(folder => (
                  <div 
                    key={folder.id} 
                    className={\`btn btn-sm \${selectedFolderId === folder.id ? 'btn-primary' : 'btn-outline'}\`} 
                    onClick={() => setSelectedFolderId(folder.id)} 
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap', flexShrink: 0, cursor: 'pointer', paddingRight: '0.4rem' }}
                  >
                    {React.createElement('ion-icon', { name: 'folder' })} {folder.name}
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginLeft: '0.3rem', opacity: 0.7 }}>
                      <span onClick={(e) => { e.stopPropagation(); renameFolder(folder.id, folder.name); }} style={{ padding: '0 3px' }} title="Đổi tên">
                        {React.createElement('ion-icon', { name: 'pencil' })}
                      </span>
                      <span onClick={(e) => { e.stopPropagation(); deleteFolder(folder.id); }} style={{ padding: '0 3px' }} title="Xóa">
                        {React.createElement('ion-icon', { name: 'trash' })}
                      </span>
                    </div>
                  </div>
                ))}`;
        code = code.substring(0, startIndex) + newString + code.substring(endIndex);
        fs.writeFileSync('frontend/src/components/admin/Files.tsx', code, 'utf8');
        console.log("Done");
    } else {
        console.log("Wrong chunk");
    }
} else {
    console.log("Not found");
}