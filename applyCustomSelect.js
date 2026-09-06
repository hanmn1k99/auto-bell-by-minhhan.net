const fs = require('fs');

function applyTo(file, isSchedules) {
  let code = fs.readFileSync(file, 'utf8');

  if (!code.includes("import { CustomSelect }")) {
    code = code.replace("import React, { useState,", "import React, { useState,\nimport { CustomSelect } from './CustomSelect';");
    if (!code.includes("import { CustomSelect }")) {
      code = code.replace(/import React.*?from 'react';/, match => match + "\nimport { CustomSelect } from './CustomSelect';");
    }
  }

  const getAudioOptions = isSchedules ? `
  const getAudioOptions = (files: any[], folders: any[]) => {
    if (!folders || folders.length === 0) {
      return files.map(f => ({ type: 'option', value: f.id, label: f.name }));
    }
    const opts: any[] = [];
    opts.push({
      type: 'group',
      label: 'Chưa phân loại',
      items: [
        { value: 'folder_null', label: 'Thêm Chưa phân loại', icon: 'add-circle-outline', color: 'var(--accent)', fontWeight: 600 },
        ...files.filter(f => !f.folderId).map(f => ({ value: f.id, label: f.name }))
      ]
    });
    
    folders.forEach(folder => {
      const folderFiles = files.filter(f => f.folderId === folder.id);
      if (folderFiles.length > 0) {
        opts.push({
          type: 'group',
          label: folder.name,
          items: [
            { value: \`folder_\${folder.id}\`, label: \`Thêm \${folder.name}\`, icon: 'add-circle-outline', color: 'var(--accent)', fontWeight: 600 },
            ...folderFiles.map(f => ({ value: f.id, label: f.name }))
          ]
        });
      }
    });
    return opts;
  };
` : `
  const getAudioOptions = (files: any[], folders: any[]) => {
    if (!folders || folders.length === 0) {
      return files.map(f => ({ type: 'option', value: f.id, label: f.name }));
    }
    const opts: any[] = [];
    opts.push({
      type: 'group',
      label: 'Chưa phân loại',
      items: files.filter(f => !f.folderId).map(f => ({ value: f.id, label: f.name }))
    });
    folders.forEach(folder => {
      const folderFiles = files.filter(f => f.folderId === folder.id);
      if (folderFiles.length > 0) {
        opts.push({
          type: 'group',
          label: folder.name,
          items: folderFiles.map(f => ({ value: f.id, label: f.name }))
        });
      }
    });
    return opts;
  };
`;

  // Insert before export const ...
  const funcRegex = /export const (Schedules|PeriodsTab) = \(\) => \{/;
  code = code.replace(funcRegex, match => getAudioOptions + "\n" + match);
  
  if (isSchedules) {
    const selectRegex = /<select className="input" value=\{addFileId\} onChange=\{e => setAddFileId\(e\.target\.value\)\}>[\s\S]*?<\/select>/;
    const newSelect = `<CustomSelect value={addFileId} onChange={(val: string) => setAddFileId(val)} options={getAudioOptions(files, folders)} placeholder="Chọn bài để thêm..." />`;
    code = code.replace(selectRegex, newSelect);

    const bulkRegex = /<select className="input" value=\{bulkAudio\} onChange=\{e => setBulkAudio\(e\.target\.value\)\}>[\s\S]*?<\/select>/;
    const newBulk = `<CustomSelect value={bulkAudio} onChange={(val: string) => setBulkAudio(val)} options={getAudioOptions(files, folders).map(o => o.type === 'group' ? {...o, items: o.items.filter((i:any) => !String(i.value).startsWith('folder_'))} : o)} placeholder="Chọn file âm thanh..." />`;
    code = code.replace(bulkRegex, newBulk);
  } else {
    const pFormRegex = /<select className="input" value=\{pForm\.audioFileId\} onChange=\{e => setPForm\(\{\s*\.\.\.pForm,\s*audioFileId:\s*e\.target\.value\s*\}\)\}>[\s\S]*?<\/select>/;
    const newPForm = `<CustomSelect value={pForm.audioFileId} onChange={(val: string) => setPForm({ ...pForm, audioFileId: val })} options={getAudioOptions(files, folders)} placeholder="Chọn file âm thanh..." />`;
    code = code.replace(pFormRegex, newPForm);
  }

  fs.writeFileSync(file, code, 'utf8');
}

applyTo('frontend/src/components/admin/Schedules.tsx', true);
applyTo('frontend/src/components/admin/PeriodsTab.tsx', false);
