const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/admin/Files.tsx', 'utf8');

const startStr = "const handleDragEnd = async (event: DragEndEvent) => {";
const startIdx = code.indexOf(startStr);
if (startIdx !== -1) {
    const endStr = "  const toggleFolderCollapse = (fId: string)";
    const endIdx = code.indexOf(endStr, startIdx);
    
    if (endIdx !== -1) {
        const newHandleDragEnd = `const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    if (active.id === over.id) return;

    const activeIdStr = active.id.toString();
    const overIdStr = over.id.toString();

    // 1. FOLDER REORDERING
    if (activeIdStr.startsWith('folder-') && overIdStr.startsWith('folder-')) {
      const oldIndex = folders.findIndex(f => 'folder-' + f.id === activeIdStr);
      const newIndex = folders.findIndex(f => 'folder-' + f.id === overIdStr);
      if (oldIndex !== -1 && newIndex !== -1) {
        const newFolders = arrayMove(folders, oldIndex, newIndex);
        const orderedIds = newFolders.map(f => f.id);
        setFolders(newFolders); // Optimistic UI update
        try {
          await axios.put(\`\${API_URL}/api/files/folders/reorder\`, { orderedIds }, { headers: { Authorization: \`Bearer \${localStorage.getItem('token')}\` } });
          fetchFolders();
        } catch (e) {
          fetchFolders(); // Revert on failure
        }
      }
      return;
    }

    // 2. FILE MOVED TO ANOTHER FOLDER TAB
    if (overIdStr.startsWith('folder-drop-')) {
      const activeFile = files.find(f => f.id.toString() === activeIdStr);
      if (activeFile) {
        const targetFolderIdStr = overIdStr.replace('folder-drop-', '');
        if (targetFolderIdStr === 'all') return;
        const targetFolderId = targetFolderIdStr === 'unassigned' ? null : Number(targetFolderIdStr);
        
        try {
          await api.put(\`/api/files/\${activeFile.id}\`, { name: activeFile.name, folderId: targetFolderId });
          fetchFiles();
        } catch (e) {
          console.error(e);
        }
      }
      return;
    }

    // 3. FILE REORDERING / CROSS FOLDER FILE DRAGGING (File dropped on File)
    const activeFile = files.find(f => f.id.toString() === activeIdStr);
    const overFile = files.find(f => f.id.toString() === overIdStr);
    
    if (activeFile && overFile) {
      if (activeFile.folderId === overFile.folderId) {
        // Reordering within the same folder
        const folderFiles = files.filter(f => f.folderId === activeFile.folderId);
        const oldIndex = folderFiles.findIndex(f => f.id === activeFile.id);
        const newIndex = folderFiles.findIndex(f => f.id === overFile.id);
        
        const newFolderFiles = arrayMove(folderFiles, oldIndex, newIndex) as any[];
        const orderedIds = newFolderFiles.map(f => f.id);
        
        try {
          await axios.put(\`\${API_URL}/api/files/reorder\`, { orderedIds }, { headers: { Authorization: \`Bearer \${localStorage.getItem('token')}\` } });
          fetchFiles();
        } catch (e) {
          console.error(e);
        }
      } else {
        // Moved to a different folder by dropping on a file in that folder!
        try {
          await api.put(\`/api/files/\${activeFile.id}\`, { name: activeFile.name, folderId: overFile.folderId });
          fetchFiles();
        } catch (e) {
          console.error(e);
        }
      }
    }
  };

`;
        code = code.substring(0, startIdx) + newHandleDragEnd + code.substring(endIdx);
        fs.writeFileSync('frontend/src/components/admin/Files.tsx', code, 'utf8');
        console.log("Done");
    }
}