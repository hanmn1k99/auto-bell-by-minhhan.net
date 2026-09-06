const fs = require('fs');
let text = fs.readFileSync('frontend/src/components/admin/PeriodsTab.tsx', 'utf8');

// Add state
text = text.replace(
  'const padT = (s: string) => s.padStart(2, "0");',
  'const [togglingIds, setTogglingIds] = useState<number[]>([]);\n  const [isBulkToggling, setIsBulkToggling] = useState(false);\n  const padT = (s: string) => s.padStart(2, "0");'
);

// Fix toggleSingleActive
text = text.replace(
  /const toggleSingleActive = async \(p: any\) => \{\s+try \{/g,
  'const toggleSingleActive = async (p: any) => {\n      setTogglingIds(prev => [...prev, p.id]);\n      try {'
);
text = text.replace(
  /notify\("Lỗi bật\/tắt tiết", "err"\);\s+\}/g,
  'notify("Lỗi bật/tắt tiết", "err");\n    } finally {\n      setTogglingIds(prev => prev.filter(id => id !== p.id));\n    }'
);

// Fix bulkToggleActive
text = text.replace(
  /const bulkToggleActive = async \(isActive: boolean\) => \{\s+if \(selectedPeriods\.length === 0\) return;\s+try \{/g,
  'const bulkToggleActive = async (isActive: boolean) => {\n      if (selectedPeriods.length === 0) return;\n      setIsBulkToggling(true);\n      try {'
);
text = text.replace(
  /\} catch \{\s+notify\(\Lỗi \$\{isActive \? "bật" : "tắt"\} hàng loạt\, "err"\);\s+\}/g,
  '} catch {\n      notify(Lỗi  hàng loạt, "err");\n    } finally {\n      setIsBulkToggling(false);\n    }'
);

// Fix missing space
text = text.replace(
  '{React.createElement("ion-icon", { name: "musical-notes-outline" })} Đổi nhạc\n              {selectedPeriods.length}',
  '{React.createElement("ion-icon", { name: "musical-notes-outline" })} Đổi nhạc{" "}\n              {selectedPeriods.length}'
);

fs.writeFileSync('frontend/src/components/admin/PeriodsTab.tsx', text, 'utf8');