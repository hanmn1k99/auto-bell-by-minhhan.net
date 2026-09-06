const fs = require('fs');

function replaceSelect(filepath) {
  let code = fs.readFileSync(filepath, 'utf8');
  
  // Update ctx destructuring
  const ctxAdd = `fetchDevices, fetchFiles, fetchFolders, folders, API_URL`;
  code = code.replace(/fetchDevices, fetchFiles, API_URL/, ctxAdd);
  
  // Replace <select> block
  const selectRegex = /<select className="input".*?>[\s\S]*?<\/select>/g;
  
  code = code.replace(selectRegex, (match) => {
    // We only want to replace file selectors, not others.
    if (match.includes('value={addFileId}') || match.includes('value={bulkAudio}') || match.includes('value={pForm.audioFileId}')) {
      const selectOpening = match.match(/<select className="input".*?>/)[0];
      const defaultOption = match.match(/<option value="">.*?<\/option>/)?.[0] || '<option value="">Chọn bài...</option>';
      
      const newSelect = `${selectOpening}
                        ${defaultOption}
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
      return newSelect;
    }
    return match;
  });
  fs.writeFileSync(filepath, code, 'utf8');
}

replaceSelect('frontend/src/components/admin/Schedules.tsx');
replaceSelect('frontend/src/components/admin/PeriodsTab.tsx');