const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/admin/Schedules.tsx', 'utf8');

// Update addSong logic
const addSongRegex = /const addSong = async \(s: Schedule\) => \{[\s\S]*?\}\s*catch \{ notify\('Lỗi thêm bài', 'err'\); \}\s*\};/;
const newAddSong = `const addSong = async (s: Schedule) => {
      if (!addFileId || !s.playlist) return;
      try {
        if (addFileId.startsWith('folder_')) {
          const folderIdStr = addFileId.replace('folder_', '');
          const folderIdNum = folderIdStr === 'null' ? null : Number(folderIdStr);
          const folderFiles = files.filter(f => f.folderId === folderIdNum).map(f => f.id);
          if (folderFiles.length === 0) {
             notify('Thư mục trống!');
             return;
          }
          await api.post(\`/api/playlists/\${s.playlist.id}/items\`, { audioFileIds: folderFiles });
          setAddFileId(''); fetchSchedules(); notify('Đã thêm thư mục!');
        } else {
          await api.post(\`/api/playlists/\${s.playlist.id}/items\`, { audioFileId: Number(addFileId) });
          setAddFileId(''); fetchSchedules(); notify('Đã thêm bài!');
        }
      } catch { notify('Lỗi thêm bài', 'err'); }
    };`;
code = code.replace(addSongRegex, newAddSong);

// Update select rendering
const selectRegex = /<select className="input" value=\{addFileId\} onChange=\{e => setAddFileId\(e\.target\.value\)\}>[\s\S]*?<\/select>/;
const newSelect = `<select className="input" value={addFileId} onChange={e => setAddFileId(e.target.value)}>
                        <option value="">Chọn bài để thêm...</option>
                        {folders && folders.length > 0 ? (
                           <>
                             <optgroup label="Chưa phân loại">
                               <option value="folder_null" style={{color: 'var(--accent)', fontWeight: 'bold'}}>➕ [Thêm tất cả] Chưa phân loại</option>
                               {files.filter(f => !f.folderId).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                             </optgroup>
                             {folders.map(folder => {
                               const folderFiles = files.filter(f => f.folderId === folder.id);
                               if (folderFiles.length === 0) return null;
                               return (
                                 <optgroup key={folder.id} label={folder.name}>
                                   <option value={\`folder_\${folder.id}\`} style={{color: 'var(--accent)', fontWeight: 'bold'}}>➕ [Thêm tất cả] {folder.name}</option>
                                   {folderFiles.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                 </optgroup>
                               );
                             })}
                           </>
                        ) : (
                           files.map(f => <option key={f.id} value={f.id}>{f.name}</option>)
                        )}
                      </select>`;
code = code.replace(selectRegex, newSelect);

fs.writeFileSync('frontend/src/components/admin/Schedules.tsx', code, 'utf8');