import { Project, SyntaxKind } from "ts-morph";

const project = new Project();
const sourceFile = project.addSourceFileAtPath("src/components/admin/Files.tsx");

// 1. Replace handleDragEnd
const func = sourceFile.getVariableDeclaration("handleDragEnd");
if (func) {
    const initializer = func.getInitializerIfKind(SyntaxKind.ArrowFunction);
    if (initializer) {
        initializer.setBodyText(`
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
      
      const newFolders = arrayMove(folders, oldIndex, newIndex) as any[];
      const orderedIds = newFolders.map(f => f.id);
      
      try {
        axios.put(\`\${API_URL}/api/files/folders/reorder\`, { orderedIds }, { headers: { Authorization: \`Bearer \${localStorage.getItem('token')}\` } })
          .then(() => fetchFolders());
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
        axios.put(\`\${API_URL}/api/files/move\`, { fileIds: [activeFileId], folderId: targetFolderId }, { headers: { Authorization: \`Bearer \${localStorage.getItem('token')}\` } })
          .then(() => { fetchFiles(); notify('Đã chuyển tệp'); });
      } catch (e) {
        console.error(e);
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
          axios.put(\`\${API_URL}/api/files/reorder\`, { orderedIds }, { headers: { Authorization: \`Bearer \${localStorage.getItem('token')}\` } })
            .then(() => fetchFiles());
        } catch (e) {
          console.error(e);
        }
      }
    }
        `);
    }
}

// 2. We need to create a DroppableFolder component and wrap the folders with SortableContext
const importDecl = sourceFile.getImportDeclaration(decl => decl.getModuleSpecifierValue() === "@dnd-kit/core");
if (importDecl) {
    if (!importDecl.getNamedImports().some(i => i.getName() === "useDroppable")) {
        importDecl.addNamedImport("useDroppable");
    }
}
const utilsImport = sourceFile.getImportDeclaration(decl => decl.getModuleSpecifierValue() === "@dnd-kit/utilities");
if (!utilsImport) {
    sourceFile.addImportDeclaration({
        moduleSpecifier: "@dnd-kit/utilities",
        namedImports: ["CSS"]
    });
}
const sortableImport = sourceFile.getImportDeclaration(decl => decl.getModuleSpecifierValue() === "@dnd-kit/sortable");
if (sortableImport) {
    if (!sortableImport.getNamedImports().some(i => i.getName() === "useSortable")) {
        sortableImport.addNamedImport("useSortable");
    }
}

const filesComp = sourceFile.getVariableStatement("Files");
if (filesComp && !sourceFile.getVariableStatement("DroppableFolder")) {
    sourceFile.insertVariableStatement(filesComp.getChildIndex(), {
        isExported: false,
        declarationKind: "const",
        declarations: [{
            name: "DroppableFolder",
            initializer: `({ id, isSortable, onClick, isActive, onRename, onDelete, name }: any) => {
  const { isOver: isDroppableOver, setNodeRef: setDroppableRef } = useDroppable({ id: 'folder-drop-' + id });
  
  const { attributes, listeners, setNodeRef: setSortableRef, transform, transition, isDragging } = useSortable({ id: 'folder-' + id });
  
  const setRef = (node: any) => {
    setDroppableRef(node);
    if (isSortable) setSortableRef(node);
  };
  
  const style = isSortable ? { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 } : {};
  
  return (
    <div 
      ref={setRef} 
      className={\`btn btn-sm \${isActive ? 'btn-primary' : 'btn-outline'}\`} 
      onClick={onClick} 
      style={{ ...style, display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap', flexShrink: 0, cursor: isSortable ? 'grab' : 'pointer', paddingRight: '0.4rem', border: isDroppableOver ? '2px dashed var(--primary)' : undefined }}
      {...(isSortable ? attributes : {})}
      {...(isSortable ? listeners : {})}
    >
      {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
      {/* @ts-ignore */}
      {React.createElement('ion-icon', { name: 'folder' })} {name}
      {isSortable && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginLeft: '0.3rem', opacity: 0.7 }}>
          <span onClick={(e) => { e.stopPropagation(); onRename(); }} style={{ padding: '0 3px', cursor: 'pointer' }} title="Đổi tên">
            {/* @ts-ignore */}
            {React.createElement('ion-icon', { name: 'pencil' })}
          </span>
          <span onClick={(e) => { e.stopPropagation(); onDelete(); }} style={{ padding: '0 3px', cursor: 'pointer' }} title="Xóa">
            {/* @ts-ignore */}
            {React.createElement('ion-icon', { name: 'trash' })}
          </span>
        </div>
      )}
    </div>
  );
}`
        }]
    });
}

sourceFile.saveSync();
console.log("Done phase 1");