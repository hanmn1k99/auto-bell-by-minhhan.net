const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/admin/Schedules.tsx', 'utf8');

if (!code.includes("import { CustomSelect }")) {
  code = code.replace("import React, { useState, useEffect, useContext, useRef } from 'react';", "import React, { useState, useEffect, useContext, useRef } from 'react';\nimport { CustomSelect } from './CustomSelect';");
}

const getOptionsLogic = `
  const getAudioOptions = () => {
    if (!folders || folders.length === 0) {
      return files.map(f => ({ type: 'option', value: f.id, label: f.name }));
    }
    const opts = [];
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
`;

// Insert getAudioOptions inside the component
// The component is `const Schedules = () => { ... }`
if (!code.includes("const getAudioOptions = () => {")) {
  code = code.replace("const Schedules = () => {", "const Schedules = () => {\n" + getOptionsLogic);
}

// Replace the addFile select
const selectRegex = /<select className="input" value=\{addFileId\} onChange=\{e => setAddFileId\(e\.target\.value\)\}>[\s\S]*?<\/select>/;
const newSelect = `<CustomSelect value={addFileId} onChange={(val: string) => setAddFileId(val)} options={getAudioOptions()} placeholder="Chọn bài để thêm..." />`;
code = code.replace(selectRegex, newSelect);

// Replace the bulkAudio select
const bulkRegex = /<select className="input" value=\{bulkAudio\} onChange=\{e => setBulkAudio\(e\.target\.value\)\}>[\s\S]*?<\/select>/;
const newBulk = `<CustomSelect value={bulkAudio} onChange={(val: string) => setBulkAudio(val)} options={getAudioOptions().map(o => o.type === 'group' ? {...o, items: o.items.filter((i:any) => !String(i.value).startsWith('folder_'))} : o)} placeholder="Chọn file âm thanh..." />`;
code = code.replace(bulkRegex, newBulk);

fs.writeFileSync('frontend/src/components/admin/Schedules.tsx', code, 'utf8');