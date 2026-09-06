const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/admin/PeriodsTab.tsx', 'utf8');

const badLogic = /const getAudioOptions = \(\) => \{[\s\S]*?return opts;\n  \};\n/;
code = code.replace(badLogic, "");

const insertPos = code.indexOf("const PeriodsTab = () => {");
const newLogic = `
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
code = code.replace("const PeriodsTab = () => {", newLogic + "const PeriodsTab = () => {");
code = code.replace("options={getAudioOptions()}", "options={getAudioOptions(files, folders)}");
fs.writeFileSync('frontend/src/components/admin/PeriodsTab.tsx', code, 'utf8');

// Do the same for Schedules.tsx
let code2 = fs.readFileSync('frontend/src/components/admin/Schedules.tsx', 'utf8');
code2 = code2.replace(/const getAudioOptions = \(\) => \{[\s\S]*?return opts;\n  \};\n/, "");
const newLogic2 = `
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
`;
code2 = code2.replace("const Schedules = () => {", newLogic2 + "const Schedules = () => {");
code2 = code2.replace("options={getAudioOptions()}", "options={getAudioOptions(files, folders)}");
code2 = code2.replace("options={getAudioOptions().map(", "options={getAudioOptions(files, folders).map(");

// Check if CustomSelect is imported in Schedules.tsx
if (!code2.includes("import { CustomSelect }")) {
  code2 = code2.replace("import React, { useState, useEffect, useContext, useRef } from 'react';", "import React, { useState, useEffect, useContext, useRef } from 'react';\nimport { CustomSelect } from './CustomSelect';");
}
fs.writeFileSync('frontend/src/components/admin/Schedules.tsx', code2, 'utf8');
