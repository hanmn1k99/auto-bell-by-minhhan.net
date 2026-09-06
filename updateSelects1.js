const fs = require('fs');

// Files.tsx
let filesCode = fs.readFileSync('frontend/src/components/admin/Files.tsx', 'utf8');
if (!filesCode.includes("import { CustomSelect }")) {
  filesCode = filesCode.replace("import React, { useState, useRef, useEffect, useContext } from 'react';", "import React, { useState, useRef, useEffect, useContext } from 'react';\nimport { CustomSelect } from './CustomSelect';");
}
const moveFilesSelectRegex = /<select[\s\S]*?onChange=\{\(e\) => \{[\s\S]*?moveFiles[\s\S]*?\}\s*\}\s*>[\s\S]*?<\/select>/;
const moveFilesNew = `<CustomSelect 
  value={""} 
  placeholder="Chuyển tới..." 
  onChange={(val: string) => { if (val) moveFiles(val === 'null' ? null : Number(val)); }} 
  options={[
    { type: 'option', value: 'null', label: '-- Chưa phân loại --' },
    ...folders.map(f => ({ type: 'option', value: f.id, label: f.name }))
  ]} 
/>`;
filesCode = filesCode.replace(moveFilesSelectRegex, moveFilesNew);
fs.writeFileSync('frontend/src/components/admin/Files.tsx', filesCode, 'utf8');

// Users.tsx
let usersCode = fs.readFileSync('frontend/src/components/admin/Users.tsx', 'utf8');
if (!usersCode.includes("import { CustomSelect }")) {
  usersCode = usersCode.replace("import React, { useContext } from 'react';", "import React, { useContext } from 'react';\nimport { CustomSelect } from './CustomSelect';");
}
const usersSelectRegex = /<select className="input" value=\{newUser\.role\} onChange=\{e => setNewUser\(\{.*?role: e\.target\.value\}\)\} style=\{\{ width: '100%', boxSizing: 'border-box' \}\}>\s*<option value="OPERATOR">Người vận hành \(Operator\)<\/option>\s*<option value="ADMIN">Quản trị viên \(Admin\)<\/option>\s*<\/select>/;
const usersNew = `<CustomSelect 
  value={newUser.role} 
  onChange={(val: string) => setNewUser({...newUser, role: val})} 
  options={[
    { type: 'option', value: 'OPERATOR', label: 'Người vận hành (Operator)' },
    { type: 'option', value: 'ADMIN', label: 'Quản trị viên (Admin)' }
  ]} 
/>`;
usersCode = usersCode.replace(usersSelectRegex, usersNew);
fs.writeFileSync('frontend/src/components/admin/Users.tsx', usersCode, 'utf8');

// Departments.tsx
let depCode = fs.readFileSync('frontend/src/components/admin/Departments.tsx', 'utf8');
if (!depCode.includes("import { CustomSelect }")) {
  depCode = depCode.replace("import React, { useState, useEffect, useContext } from 'react';", "import React, { useState, useEffect, useContext } from 'react';\nimport { CustomSelect } from './CustomSelect';");
}
const depSelectRegex1 = /<select className="input" value=\{depSoundCardId\} onChange=\{e => setDepSoundCardId\(e\.target\.value\)\} style=\{\{ flex: 1 \}\}>\s*<option value="">.*?<\/option>\s*\{availableSoundCards\.map\(card => \(\s*<option key=\{card\.id\} value=\{card\.id\}>.*?<\/option>\s*\)\)\}\s*<\/select>/g;
const depNew1 = `<CustomSelect 
  value={depSoundCardId} 
  onChange={(val: string) => setDepSoundCardId(val)} 
  options={availableSoundCards.map(card => ({ type: 'option', value: card.id, label: card.name || card.id }))} 
  placeholder="Mặc định hệ thống" 
/>`;
depCode = depCode.replace(depSelectRegex1, depNew1);
fs.writeFileSync('frontend/src/components/admin/Departments.tsx', depCode, 'utf8');
