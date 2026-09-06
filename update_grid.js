const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/admin/Files.tsx', 'utf8');

// 1. Update renderFile function
const oldRenderFileRegex = /const renderFile = \(f: any\) => \{[\s\S]*?\};\s*return \(/;

const newRenderFile = `const renderFile = (f: any) => {
    const isSelected = selectedFileIds.includes(f.id);
    return (
      <div key={f.id} className={\`file-item \${isSelected ? 'selected' : ''}\`} style={{
        ...(isSelected ? { background: 'rgba(134, 59, 255, 0.12)', borderColor: '#863bff' } : {}),
        marginBottom: 0, 
        padding: '0.5rem 0.75rem',
        display: 'flex', 
        alignItems: 'center',
        gap: '0.5rem',
        borderRadius: '8px',
        border: '1px solid var(--border)',
        background: 'rgba(255, 255, 255, 0.03)'
      }}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => toggleSelectFile(f.id)}
          style={{ cursor: 'pointer', width: '16px', height: '16px', flexShrink: 0, margin: 0 }}
        />
        <span className="file-icon" style={{ flexShrink: 0, display: 'flex', alignItems: 'center', color: 'var(--accent)' }}>{React.createElement('ion-icon', { name: 'musical-note' })}</span>
        
        <div style={{ minWidth: 0, flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.9rem', fontWeight: 500 }} title={f.name}>{f.name}</span>
          <button className="btn btn-ghost btn-xs" onClick={() => renameFile(f.id, f.name)} title="Đổi tên" style={{ padding: '2px 4px', flexShrink: 0, opacity: 0.7 }}>{React.createElement('ion-icon', { name: 'pencil-outline' })}</button>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
          <MiniPlayer src={\`\${API_URL}\${f.path}\`} />
          <button className="btn btn-icon btn-danger-ghost" onClick={() => del(f.id)} title="Xóa" style={{ width: '28px', height: '28px' }}>
            {React.createElement('ion-icon', { name: 'trash-outline' })}
          </button>
        </div>
      </div>
    );
  };
  return (`

code = code.replace(oldRenderFileRegex, newRenderFile);

// 2. Update containers to be grid
// For folderFiles and unassignedFiles
code = code.replace(/<div style=\{\{ padding: '0\.5rem' \}\}>/g, `<div style={{ padding: '0.75rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.5rem' }}>`);

// For selectedFolderId !== 'all'
// We wrap it in a grid container.
code = code.replace(
    /\{selectedFolderId !== 'all' \? \(\s*files\.filter\(f => selectedFolderId === 'unassigned' \? !f\.folderId : f\.folderId === selectedFolderId\)\.map\(renderFile\)\s*\) : \(/,
    `{selectedFolderId !== 'all' ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.5rem' }}>
                {files.filter(f => selectedFolderId === 'unassigned' ? !f.folderId : f.folderId === selectedFolderId).map(renderFile)}
              </div>
            ) : (`
);

fs.writeFileSync('frontend/src/components/admin/Files.tsx', code, 'utf8');
console.log("Done");