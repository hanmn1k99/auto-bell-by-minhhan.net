const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/admin/Files.tsx', 'utf8');

// 1. Make cross-folder drop work
code = code.replace(
    /if \(activeFile && overFile && activeFile\.folderId === overFile\.folderId\) \{[\s\S]*?try \{[\s\S]*?axios\.put.*?reorder.*?\} catch \(e\) \{[\s\S]*?console\.error\(e\);\s*\}\s*\}/,
    `if (activeFile && overFile) {
        if (activeFile.folderId === overFile.folderId) {
          const folderFiles = files.filter(f => f.folderId === activeFile.folderId);
          const oldIndex = folderFiles.findIndex(f => f.id === activeFileId);
          const newIndex = folderFiles.findIndex(f => f.id === overFileId);
          
          const newFolderFiles = arrayMove(folderFiles, oldIndex, newIndex) as any[];
          const orderedIds = newFolderFiles.map(f => f.id);
          
          try {
            axios.put(\`\${API_URL}/api/files/reorder\`, { orderedIds }, { headers: { Authorization: \`Bearer \${localStorage.getItem('token')}\` } })
              .then(() => fetchFiles());
          } catch (e) {
            console.error(e);
          }
        } else {
          // Cross-folder move
          try {
            axios.put(\`\${API_URL}/api/files/move\`, { fileIds: [activeFileId], folderId: overFile.folderId }, { headers: { Authorization: \`Bearer \${localStorage.getItem('token')}\` } })
              .then(() => { fetchFiles(); notify('Đã chuyển tệp sang thư mục mới'); });
          } catch (e) {
            console.error(e);
          }
        }
      }`
);

// 2. Make the folder tabs sticky
code = code.replace(
    /<div className="folder-list-scroll" style=\{\{ display: 'flex', gap: '0\.5rem', flexWrap: 'wrap', width: '100%', paddingBottom: '0\.5rem' \}\}>/,
    `<div className="folder-list-scroll" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', width: '100%', paddingBottom: '0.5rem', position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg)', paddingTop: '0.5rem' }}>`
);

fs.writeFileSync('frontend/src/components/admin/Files.tsx', code, 'utf8');
console.log("Done");