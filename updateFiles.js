const fs = require('fs');
let text = fs.readFileSync('frontend/src/components/admin/Files.tsx', 'utf8');

// Insert state
const stateCode = `
    const [folders, setFolders] = useState<any[]>([]);
    const [selectedFolderId, setSelectedFolderId] = useState<number | 'all' | 'unassigned'>('all');

    const fetchFolders = async () => {
      try {
        const res = await api.get('/api/files/folders');
        setFolders(res.data);
      } catch (err) {
        console.error('Failed to fetch folders', err);
      }
    };

    useEffect(() => {
      fetchFolders();
    }, []);

    const createFolder = async () => {
      const name = await customPrompt('Nhập tên thư mục mới:');
      if (!name) return;
      try {
        await api.post('/api/files/folders', { name });
        fetchFolders();
        notify('Đã tạo thư mục');
      } catch (err: any) {
        notify(err.response?.data?.error || 'Lỗi tạo thư mục', 'err');
      }
    };

    const renameFolder = async (id: number, oldName: string) => {
      const name = await customPrompt('Nhập tên mới:', oldName);
      if (!name || name === oldName) return;
      try {
        await api.put(\`/api/files/folders/\${id}\`, { name });
        fetchFolders();
      } catch (err: any) {
        notify(err.response?.data?.error || 'Lỗi đổi tên', 'err');
      }
    };

    const deleteFolder = async (id: number) => {
      if (!(await customConfirm('Xóa thư mục này? Các file bên trong sẽ không bị xóa mà chuyển về Chưa phân loại.'))) return;
      try {
        await api.delete(\`/api/files/folders/\${id}\`);
        if (selectedFolderId === id) setSelectedFolderId('all');
        fetchFolders();
        fetchFiles(); // files might have been unassigned
        notify('Đã xóa thư mục');
      } catch (err: any) {
        notify(err.response?.data?.error || 'Lỗi xóa', 'err');
      }
    };

    const moveFiles = async (folderId: number | null) => {
      if (selectedFileIds.length === 0) return;
      try {
        await Promise.all(selectedFileIds.map(id => api.put(\`/api/files/\${id}/move\`, { folderId })));
        setSelectedFileIds([]);
        fetchFiles();
        notify('Đã chuyển file');
      } catch (err: any) {
        notify(err.response?.data?.error || 'Lỗi di chuyển', 'err');
      }
    };
`;
text = text.replace(/const toggleSelectFile =/, stateCode + '\n    const toggleSelectFile =');

// Replace upload
const uploadRegex = /const upload = async[\s\S]*?syncFiles\(true\);\s*};\s*/;
const uploadNew = `const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const filesToUpload = Array.from(e.target.files || []);
      if (filesToUpload.length === 0) return;
      setFileUploading(true);
      
      let successCount = 0;
      let errorCount = 0;
      const BATCH_SIZE = 50;

      for (let i = 0; i < filesToUpload.length; i += BATCH_SIZE) {
        const batch = filesToUpload.slice(i, i + BATCH_SIZE);
        setUploadProgress(\`Đang tải \${Math.min(i + BATCH_SIZE, filesToUpload.length)}/\${filesToUpload.length}...\`);
        
        const fd = new FormData();
        batch.forEach(f => fd.append('audio', f));
        if (typeof selectedFolderId === 'number') {
          fd.append('folderId', String(selectedFolderId));
        }
        
        try {
          const res = await api.post('/api/files/upload', fd);
          successCount += res.data.files?.length || batch.length;
        } catch {
          errorCount += batch.length;
        }
      }

      fetchFiles(); setFileUploading(false);
      setUploadProgress('');
      notify(\`Tải xong \${successCount} file. \${errorCount ? \`Lỗi \${errorCount} file.\` : ''}\`); syncFiles(true);
    };
    
    `;
text = text.replace(uploadRegex, uploadNew);

// Replace UI
const uiRegex = /<div style=\{\{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1\.25rem'[\s\S]*?<div className="file-list">/;
const uiNew = `
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '1rem', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem' }}>
              <button className={\`btn btn-sm \${selectedFolderId === 'all' ? 'btn-primary' : 'btn-outline'}\`} onClick={() => setSelectedFolderId('all')} style={{ whiteSpace: 'nowrap' }}>Tất cả</button>
              <button className={\`btn btn-sm \${selectedFolderId === 'unassigned' ? 'btn-primary' : 'btn-outline'}\`} onClick={() => setSelectedFolderId('unassigned')} style={{ whiteSpace: 'nowrap' }}>Chưa phân loại</button>
              {folders.map(folder => (
                <div key={folder.id} style={{ display: 'flex', gap: '2px' }}>
                  <button className={\`btn btn-sm \${selectedFolderId === folder.id ? 'btn-primary' : 'btn-outline'}\`} onClick={() => setSelectedFolderId(folder.id)} style={{ whiteSpace: 'nowrap', borderRight: 'none', borderTopRightRadius: 0, borderBottomRightRadius: 0 }}>
                    {React.createElement('ion-icon', { name: 'folder-outline' })} {folder.name}
                  </button>
                  <button className="btn btn-sm btn-outline" onClick={() => renameFolder(folder.id, folder.name)} style={{ padding: '0 5px', borderRadius: 0, borderLeft: 'none', borderRight: 'none' }} title="Đổi tên">{React.createElement('ion-icon', { name: 'pencil-outline' })}</button>
                  <button className="btn btn-sm btn-outline" onClick={() => deleteFolder(folder.id)} style={{ padding: '0 5px', borderTopLeftRadius: 0, borderBottomLeftRadius: 0, borderLeft: 'none' }} title="Xóa">{React.createElement('ion-icon', { name: 'trash-outline' })}</button>
                </div>
              ))}
              <button className="btn btn-sm btn-outline" onClick={createFolder} style={{ whiteSpace: 'nowrap', borderStyle: 'dashed' }}>+ Thư mục mới</button>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <input
                  type="checkbox"
                  checked={files.length > 0 && selectedFileIds.length === files.length}
                  onChange={toggleSelectAll}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  title="Chọn tất cả"
                />
                <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                  Đã chọn {selectedFileIds.length}/{files.length}
                </span>
                
                {selectedFileIds.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-danger-ghost btn-sm" onClick={bulkDelete} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      {React.createElement('ion-icon', { name: 'trash-outline' })} Xóa
                    </button>
                    <div style={{ position: 'relative' }} className="move-dropdown">
                      <select 
                        className="input" 
                        style={{ height: '32px', padding: '0 10px', fontSize: '0.85rem', appearance: 'menulist' }} 
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val) moveFiles(val === 'null' ? null : Number(val));
                          e.target.value = '';
                        }}
                      >
                        <option value="">Chuyển tới thư mục...</option>
                        <option value="null">-- Chưa phân loại --</option>
                        {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                      </select>
                    </div>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-outline" onClick={() => syncFiles()} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  {React.createElement('ion-icon', { name: 'sync-outline' })} Đồng bộ file
                </button>
                <div style={{ position: 'relative' }}>
                  <input
                    type="file"
                    multiple
                    accept="audio/*"
                    onChange={upload}
                    style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%' }}
                    title="Kéo thả hoặc click để tải lên"
                  />
                  <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    {React.createElement('ion-icon', { name: 'cloud-upload-outline' })} {fileUploading ? uploadProgress || 'Đang tải...' : 'Tải lên'}
                  </button>
                </div>
              </div>
            </div>
            <div className="file-list">
`;
text = text.replace(uiRegex, uiNew);

const fileMapRegex = /\{files\.map\(f => \{/g;
const newFileMap = `{files.filter(f => selectedFolderId === 'all' || (selectedFolderId === 'unassigned' ? !f.folderId : f.folderId === selectedFolderId)).map(f => {`;
text = text.replace(fileMapRegex, newFileMap);

fs.writeFileSync('frontend/src/components/admin/Files.tsx', text, 'utf8');