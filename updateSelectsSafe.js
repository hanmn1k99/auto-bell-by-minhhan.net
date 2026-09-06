const fs = require('fs');

function replaceSelect(filepath) {
  let code = fs.readFileSync(filepath, 'utf8');
  
  // Replace <select> for adding/bulk-editing audio
  const addFileRegex = /<select\s+className="input"\s+value=\{addFileId\}\s+onChange=\{e => setAddFileId\(e\.target\.value\)\}>[\s\S]*?<\/select>/;
  const newAddFile = `<select className="input" value={addFileId} onChange={e => setAddFileId(e.target.value)}>
                        <option value="">Chọn bài để thêm...</option>
                        {folders && folders.length > 0 ? (
                           <>
                             <optgroup label="Chưa phân loại">
                               {files.filter(f => !f.folderId).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                             </optgroup>
                             {folders.map(folder => {
                               const folderFiles = files.filter(f => f.folderId === folder.id);
                               if (folderFiles.length === 0) return null;
                               return (
                                 <optgroup key={folder.id} label={folder.name}>
                                   {folderFiles.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                 </optgroup>
                               );
                             })}
                           </>
                        ) : (
                           files.map(f => <option key={f.id} value={f.id}>{f.name}</option>)
                        )}
                      </select>`;
                      
  const bulkFileRegex = /<select\s+className="input"\s+value=\{bulkAudio\}\s+onChange=\{e => setBulkAudio\(e\.target\.value\)\}>[\s\S]*?<\/select>/;
  const newBulkFile = `<select className="input" value={bulkAudio} onChange={e => setBulkAudio(e.target.value)}>
                        <option value="">Chọn file âm thanh...</option>
                        {folders && folders.length > 0 ? (
                           <>
                             <optgroup label="Chưa phân loại">
                               {files.filter(f => !f.folderId).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                             </optgroup>
                             {folders.map(folder => {
                               const folderFiles = files.filter(f => f.folderId === folder.id);
                               if (folderFiles.length === 0) return null;
                               return (
                                 <optgroup key={folder.id} label={folder.name}>
                                   {folderFiles.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                 </optgroup>
                               );
                             })}
                           </>
                        ) : (
                           files.map(f => <option key={f.id} value={f.id}>{f.name}</option>)
                        )}
                      </select>`;
                      
  const pFormRegex = /<select\s+className="input"\s+value=\{pForm\.audioFileId\}\s+onChange=\{e => setPForm\(\{\s*\.\.\.pForm,\s*audioFileId:\s*e\.target\.value\s*\}\)\}>[\s\S]*?<\/select>/;
  const newPForm = `<select className="input" value={pForm.audioFileId} onChange={e => setPForm({ ...pForm, audioFileId: e.target.value })}>
                      <option value="">Chọn file âm thanh...</option>
                      {folders && folders.length > 0 ? (
                         <>
                           <optgroup label="Chưa phân loại">
                             {files.filter(f => !f.folderId).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                           </optgroup>
                           {folders.map(folder => {
                             const folderFiles = files.filter(f => f.folderId === folder.id);
                             if (folderFiles.length === 0) return null;
                             return (
                               <optgroup key={folder.id} label={folder.name}>
                                 {folderFiles.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                               </optgroup>
                             );
                           })}
                         </>
                      ) : (
                         files.map(f => <option key={f.id} value={f.id}>{f.name}</option>)
                      )}
                    </select>`;

  code = code.replace(addFileRegex, newAddFile);
  code = code.replace(bulkFileRegex, newBulkFile);
  code = code.replace(pFormRegex, newPForm);
  
  // also add ctx for folders
  const ctxAdd = `fetchDevices, fetchFiles, fetchFolders, folders, API_URL`;
  code = code.replace(/fetchDevices, fetchFiles, fetchFolders, folders, API_URL/, `fetchDevices, fetchFiles, API_URL`); // revert if already there
  code = code.replace(/fetchDevices, fetchFiles, API_URL/, ctxAdd);
  
  fs.writeFileSync(filepath, code, 'utf8');
}

replaceSelect('frontend/src/components/admin/Schedules.tsx');
replaceSelect('frontend/src/components/admin/PeriodsTab.tsx');