const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/admin/PeriodsTab.tsx', 'utf8');

if (!code.includes("import { CustomSelect }")) {
  code = code.replace("import React, { useState, useEffect, useContext } from 'react';", "import React, { useState, useEffect, useContext } from 'react';\nimport { CustomSelect } from './CustomSelect';");
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

if (!code.includes("const getAudioOptions = () => {")) {
  code = code.replace("const PeriodsTab = () => {", "const PeriodsTab = () => {\n" + getOptionsLogic);
}

const selectRegex = /<select className="input" value=\{pForm\.audioFileId\} onChange=\{e => setPForm\(\{\s*\.\.\.pForm,\s*audioFileId:\s*e\.target\.value\s*\}\)\}>[\s\S]*?<\/select>/;
const newSelect = `<CustomSelect value={pForm.audioFileId} onChange={(val: string) => setPForm({ ...pForm, audioFileId: val })} options={getAudioOptions()} placeholder="Chọn file âm thanh..." />`;
code = code.replace(selectRegex, newSelect);

fs.writeFileSync('frontend/src/components/admin/PeriodsTab.tsx', code, 'utf8');