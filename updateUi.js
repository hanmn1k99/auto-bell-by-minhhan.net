const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/admin/Files.tsx', 'utf8');

const targetRegex = /<div className="card-header" style=\{\{ flexWrap: 'wrap', gap: '0\.75rem' \}\}>[\s\S]*?<\/div>\s*<\/div>\s*<div className="file-list">/;
const newUi = `<div className="card-header" style={{ flexWrap: 'wrap', gap: '0.75rem', borderBottom: 'none', paddingBottom: '0.5rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', width: '100%', paddingBottom: '0.5rem' }}>
              <button className={\`btn btn-sm \${selectedFolderId === 'all' ? 'btn-primary' : 'btn-outline'}\`} onClick={() => setSelectedFolderId('all')} style={{ whiteSpace: 'nowrap' }}>Tất cả</button>
              <button className={\`btn btn-sm \${selectedFolderId === 'unassigned' ? 'btn-primary' : 'btn-outline'}\`} onClick={() => setSelectedFolderId('unassigned')} style={{ whiteSpace: 'nowrap' }}>Chưa phân loại</button>
              {folders.map(folder => (
                <div key={folder.id} style={{ display: 'flex', gap: '2px' }}>
                  <button className={\`btn btn-sm \${selectedFolderId === folder.id ? 'btn-primary' : 'btn-outline'}\`} onClick={() => setSelectedFolderId(folder.id)} style={{ whiteSpace: 'nowrap', borderRight: 'none', borderTopRightRadius: 0, borderBottomRightRadius: 0 }}>
                    {React.createElement('ion-icon', { name: 'folder' })} {folder.name}
                  </button>
                  <button className="btn btn-sm btn-outline" onClick={() => renameFolder(folder.id, folder.name)} style={{ padding: '0 5px', borderRadius: 0, borderLeft: 'none', borderRight: 'none' }} title="Đổi tên">{React.createElement('ion-icon', { name: 'pencil' })}</button>
                  <button className="btn btn-sm btn-outline" onClick={() => deleteFolder(folder.id)} style={{ padding: '0 5px', borderTopLeftRadius: 0, borderBottomLeftRadius: 0, borderLeft: 'none' }} title="Xóa">{React.createElement('ion-icon', { name: 'trash' })}</button>
                </div>
              ))}
              <button className="btn btn-sm btn-outline" onClick={createFolder} style={{ whiteSpace: 'nowrap', borderStyle: 'dashed' }}>+ Thư mục mới</button>
            </div>
          </div>

          <div className="card-header" style={{ flexWrap: 'wrap', gap: '0.75rem', paddingTop: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h3>Kho dữ liệu ({files.length})</h3>
              {files.length > 0 && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', userSelect: 'none' }}>
                  <input
                    type="checkbox"
                    checked={files.length > 0 && selectedFileIds.length === files.length}
                    onChange={toggleSelectAll}
                  />
                  Chọn tất cả
                </label>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              {selectedFileIds.length > 0 && (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-danger-ghost btn-sm" onClick={bulkDelete}>
                    {React.createElement('ion-icon', { name: 'trash-outline' })} Xóa ({selectedFileIds.length})
                  </button>
                  <select 
                    className="input" 
                    style={{ height: '32px', padding: '0 10px', fontSize: '0.85rem', width: 'auto' }} 
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val) moveFiles(val === 'null' ? null : Number(val));
                      e.target.value = '';
                    }}
                  >
                    <option value="">Chuyển tới...</option>
                    <option value="null">-- Chưa phân loại --</option>
                    {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
              )}
              
              <button className="btn btn-outline btn-sm" onClick={() => syncFiles()} disabled={!!syncStatus}>
                {React.createElement('ion-icon', { name: syncStatus ? 'sync' : 'sync-outline', className: syncStatus ? 'spin' : '' })} {syncStatus || 'Đồng bộ'}
              </button>
              
              <label className={\`btn btn-primary btn-sm \${fileUploading ? 'disabled' : ''}\`}>
                {fileUploading ? (
                  <>{React.createElement('ion-icon', { name: 'hourglass-outline' })} {uploadProgress}</>
                ) : (
                  <>{React.createElement('ion-icon', { name: 'cloud-upload-outline' })} Tải lên</>
                )}
                <input type="file" accept="audio/*" multiple hidden onChange={upload} disabled={fileUploading} />
              </label>
            </div>
          </div>
          <div className="file-list">`;

code = code.replace(targetRegex, newUi);
fs.writeFileSync('frontend/src/components/admin/Files.tsx', code, 'utf8');