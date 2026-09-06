const fs = require('fs');

let periodsCode = fs.readFileSync('frontend/src/components/admin/PeriodsTab.tsx', 'utf8');

const pFormAudioRegex = /<select[\s\S]*?value=\{pForm\.audioFileId\}[\s\S]*?onChange=\{\(e\) =>\s*setPForm\(\{ \.\.\.pForm, audioFileId: e\.target\.value \}\)\s*\}[\s\S]*?>[\s\S]*?<\/select>/g;
const pFormAudioNew = `<CustomSelect 
  value={pForm.audioFileId} 
  onChange={(val: string) => setPForm({ ...pForm, audioFileId: val })} 
  options={getAudioOptions(files, folders)} 
  placeholder="Chọn file âm thanh..." 
/>`;
periodsCode = periodsCode.replace(pFormAudioRegex, pFormAudioNew);

const bulkAudioRegex = /<select[\s\S]*?value=\{bulkAudio\}[\s\S]*?onChange=\{\(e\) => setBulkAudio\(e\.target\.value\)\}[\s\S]*?>[\s\S]*?<\/select>/g;
const bulkAudioNew = `<CustomSelect 
  value={bulkAudio} 
  onChange={(val: string) => setBulkAudio(val)} 
  options={getAudioOptions(files, folders)} 
  placeholder="Chọn file âm thanh..." 
/>`;
periodsCode = periodsCode.replace(bulkAudioRegex, bulkAudioNew);

const bulkEditAudioRegex = /<select[\s\S]*?value=\{bulkEditPeriodForm\.audioFileId\}[\s\S]*?onChange=\{\(e\) =>\s*setBulkEditPeriodForm\(\{[\s\S]*?audioFileId: e\.target\.value,[\s\S]*?\}\)\s*\}[\s\S]*?>[\s\S]*?<\/select>/g;
const bulkEditAudioNew = `<CustomSelect 
  value={bulkEditPeriodForm.audioFileId} 
  onChange={(val: string) => setBulkEditPeriodForm({ ...bulkEditPeriodForm, audioFileId: val })} 
  options={getAudioOptions(files, folders)} 
  placeholder="Giữ nguyên" 
/>`;
periodsCode = periodsCode.replace(bulkEditAudioRegex, bulkEditAudioNew);

const depOptionsFn = `
  const getDepOptions = () => departments.map(d => ({ type: 'option', value: d.id, label: d.name }));
`;
if (!periodsCode.includes("const getDepOptions = () =>")) {
  periodsCode = periodsCode.replace("const PeriodsTab = () => {", "const PeriodsTab = () => {\n" + depOptionsFn);
}

const pFormDepRegex = /<select[\s\S]*?value=\{pForm\.departmentId\}[\s\S]*?onChange=\{\(e\) =>\s*setPForm\(\{ \.\.\.pForm, departmentId: e\.target\.value \}\)\s*\}[\s\S]*?>[\s\S]*?<\/select>/g;
const pFormDepNew = `<CustomSelect 
  value={pForm.departmentId} 
  onChange={(val: string) => setPForm({ ...pForm, departmentId: val })} 
  options={getDepOptions()} 
  placeholder="Mặc định" 
/>`;
periodsCode = periodsCode.replace(pFormDepRegex, pFormDepNew);

const bulkDepRegex = /<select[\s\S]*?value=\{bulkDep\}[\s\S]*?onChange=\{\(e\) => setBulkDep\(e\.target\.value\)\}[\s\S]*?>[\s\S]*?<\/select>/g;
const bulkDepNew = `<CustomSelect 
  value={bulkDep} 
  onChange={(val: string) => setBulkDep(val)} 
  options={getDepOptions()} 
  placeholder="Mặc định" 
/>`;
periodsCode = periodsCode.replace(bulkDepRegex, bulkDepNew);

fs.writeFileSync('frontend/src/components/admin/PeriodsTab.tsx', periodsCode, 'utf8');
