const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/admin/Files.tsx', 'utf8');

// Replace handleDragEnd
const oldHandleDragEndRegex = /const handleDragEnd = async \(event: DragEndEvent\) => \{[\s\S]*?\}\s*\}\s*\};\s*\}\s*\};/m;

const newHandleDragEnd = `const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    
    const activeIdStr = active.id.toString();
    const overIdStr = over.id.toString();
    
    if (activeIdStr === overIdStr) return;

    // Handle Folder Reordering
    if (activeIdStr.startsWith('folder-') && overIdStr.startsWith('folder-')) {
      const activeFolderId = parseInt(activeIdStr.replace('folder-', ''));
      const overFolderId = parseInt(overIdStr.replace('folder-', ''));
      
      const oldIndex = folders.findIndex(f => f.id === activeFolderId);
      const newIndex = folders.findIndex(f => f.id === overFolderId);
      
      const newFolders = arrayMove(folders, oldIndex, newIndex);
      const orderedIds = newFolders.map(f => f.id);
      
      try {
        await axios.put(\`\${API_URL}/api/files/folders/reorder\`, { orderedIds }, { headers: { Authorization: \`Bearer \${localStorage.getItem('token')}\` } });
        fetchFolders();
      } catch (e) {
        console.error(e);
      }
      return;
    }

    // Handle File moving to Folder via Drop
    if (activeIdStr.startsWith('file-') && overIdStr.startsWith('folder-drop-')) {
      const activeFileId = parseInt(activeIdStr.replace('file-', ''));
      const targetFolderStr = overIdStr.replace('folder-drop-', '');
      const targetFolderId = targetFolderStr === 'unassigned' ? null : parseInt(targetFolderStr);
      
      try {
        await axios.put(\`\${API_URL}/api/files/move\`, { fileIds: [activeFileId], folderId: targetFolderId }, { headers: { Authorization: \`Bearer \${localStorage.getItem('token')}\` } });
        fetchFiles();
        notify('Đã chuyển tệp');
      } catch (e) {
        console.error(e);
        notify('Lỗi di chuyển tệp', 'err');
      }
      return;
    }

    // Handle File Reordering
    if (activeIdStr.startsWith('file-') && overIdStr.startsWith('file-')) {
      const activeFileId = parseInt(activeIdStr.replace('file-', ''));
      const overFileId = parseInt(overIdStr.replace('file-', ''));
      
      const activeFile = files.find(f => f.id === activeFileId);
      const overFile = files.find(f => f.id === overFileId);
      
      if (activeFile && overFile && activeFile.folderId === overFile.folderId) {
        const folderFiles = files.filter(f => f.folderId === activeFile.folderId);
        const oldIndex = folderFiles.findIndex(f => f.id === activeFileId);
        const newIndex = folderFiles.findIndex(f => f.id === overFileId);
        
        const newFolderFiles = arrayMove(folderFiles, oldIndex, newIndex) as any[];
        const orderedIds = newFolderFiles.map(f => f.id);
        
        try {
          await axios.put(\`\${API_URL}/api/files/reorder\`, { orderedIds }, { headers: { Authorization: \`Bearer \${localStorage.getItem('token')}\` } });
          fetchFiles();
        } catch (e) {
          console.error(e);
        }
      }
    }
  };`;

// Note: the regex for old handleDragEnd might not match exactly. Let's use string operations.
const startDragEnd = code.indexOf('const handleDragEnd = async (event: DragEndEvent) => {');
if (startDragEnd !== -1) {
    const endDragEnd = code.indexOf('};', code.indexOf('};', code.indexOf('};', startDragEnd) + 2) + 2) + 2; // naive approach
    // Better to just substring it out manually.
}