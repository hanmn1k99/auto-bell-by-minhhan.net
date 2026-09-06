const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/admin/Files.tsx', 'utf8');

// 1. Add state for collapsed folders if not present
if (!code.includes('collapsedFolders')) {
    code = code.replace(
        "const [selectedFolderId, setSelectedFolderId] = useState<number | 'all' | 'unassigned'>('all');",
        "const [selectedFolderId, setSelectedFolderId] = useState<number | 'all' | 'unassigned'>('all');\n  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});\n  const toggleFolderCollapse = (fId: string) => setCollapsedFolders(prev => ({...prev, [fId]: !prev[fId]}));"
    );
}

// 2. Insert renderFile if not present
const renderFileString = `
  const renderFile = (f: any) => {
    const isSelected = selectedFileIds.includes(f.id);
    return (
      <div key={f.id} className={\`file-item \${isSelected ? 'selected' : ''}\`} style={isSelected ? { background: 'rgba(134, 59, 255, 0.12)', borderColor: '#863bff', marginBottom: '0.25rem' } : { marginBottom: '0.25rem' }}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => toggleSelectFile(f.id)}
          style={{ marginRight: '0.5rem', cursor: 'pointer', width: '16px', height: '16px' }}
        />
        <span className="file-icon">{React.createElement('ion-icon', { name: 'musical-note' })}</span>
        <div className="file-info" style={{ minWidth: 0, flex: 1 }}>
          <div className="file-name" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, flex: 1 }} title={f.name}>{f.name}</span>
            <button className="btn btn-ghost btn-xs" onClick={() => renameFile(f.id, f.name)} title="Đổi tên" style={{ padding: '2px 4px', flexShrink: 0 }}>{React.createElement('ion-icon', { name: 'pencil-outline' })}</button>
          </div>
          <div className="file-meta" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={f.filename}>{f.filename}</div>
        </div>
        <MiniPlayer src={\`\${API_URL}\${f.path}\`} />
        <button className="btn btn-icon btn-danger-ghost" onClick={() => del(f.id)} title="Xóa">
          {React.createElement('ion-icon', { name: 'trash-outline' })}
        </button>
      </div>
    );
  };
`;

if (!code.includes('const renderFile =')) {
    code = code.replace(
        /return \(\s*<div className="fade-in">/,
        renderFileString + "\n  return (\n    <div className=\"fade-in\">"
    );
}

// 3. Replace <div className="file-list"> to the end of the file
const groupedRender = `          <div className="file-list">
            {files.length === 0 && <div className="empty-state">Chưa có tệp nào. Hãy tải lên!</div>}
            
            {selectedFolderId !== 'all' ? (
              files.filter(f => selectedFolderId === 'unassigned' ? !f.folderId : f.folderId === selectedFolderId).map(renderFile)
            ) : (
              <>
                {folders.map(folder => {
                  const folderFiles = files.filter(f => f.folderId === folder.id);
                  if (folderFiles.length === 0) return null;
                  const isCollapsed = collapsedFolders[folder.id.toString()];
                  return (
                    <div key={folder.id} style={{ marginBottom: '1rem', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                      <div 
                        onClick={() => toggleFolderCollapse(folder.id.toString())}
                        style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', background: 'rgba(255,255,255,0.02)', borderBottom: isCollapsed ? 'none' : '1px solid var(--border)' }}
                      >
                        {React.createElement('ion-icon', { name: isCollapsed ? 'chevron-forward-outline' : 'chevron-down-outline', style: { color: 'var(--text-muted)' } })}
                        {React.createElement('ion-icon', { name: 'folder-outline', style: { color: 'var(--accent)' } })}
                        <strong style={{ flex: 1, color: 'var(--text)' }}>{folder.name}</strong>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{folderFiles.length} tệp</span>
                      </div>
                      {!isCollapsed && (
                        <div style={{ padding: '0.5rem' }}>
                          {folderFiles.map(renderFile)}
                        </div>
                      )}
                    </div>
                  );
                })}
                
                {/* Unassigned files */}
                {files.filter(f => !f.folderId).length > 0 && (() => {
                  const unassignedFiles = files.filter(f => !f.folderId);
                  const isCollapsed = collapsedFolders['unassigned'];
                  return (
                    <div style={{ marginBottom: '1rem', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                      <div 
                        onClick={() => toggleFolderCollapse('unassigned')}
                        style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', background: 'rgba(255,255,255,0.02)', borderBottom: isCollapsed ? 'none' : '1px solid var(--border)' }}
                      >
                        {React.createElement('ion-icon', { name: isCollapsed ? 'chevron-forward-outline' : 'chevron-down-outline', style: { color: 'var(--text-muted)' } })}
                        {React.createElement('ion-icon', { name: 'folder-outline', style: { color: 'var(--text-muted)' } })}
                        <strong style={{ flex: 1, color: 'var(--text)' }}>Chưa phân loại</strong>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{unassignedFiles.length} tệp</span>
                      </div>
                      {!isCollapsed && (
                        <div style={{ padding: '0.5rem' }}>
                          {unassignedFiles.map(renderFile)}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  export default FilesTab;
`;

const startIndex = code.indexOf('<div className="file-list">');
if (startIndex !== -1) {
    code = code.substring(0, startIndex) + groupedRender;
}

fs.writeFileSync('frontend/src/components/admin/Files.tsx', code, 'utf8');
console.log("Done");