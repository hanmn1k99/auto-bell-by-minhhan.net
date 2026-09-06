const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/admin/Files.tsx', 'utf8');

code = code.replace(/export default FilesTab;\s*/, "");

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
        /return \(\s*<div className="admin-section">/,
        renderFileString + "\n    return (\n      <div className=\"admin-section\">"
    );
}

fs.writeFileSync('frontend/src/components/admin/Files.tsx', code, 'utf8');
console.log("Done");