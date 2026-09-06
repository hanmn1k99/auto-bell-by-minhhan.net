const fs = require('fs');
let text = fs.readFileSync('frontend/src/components/admin/PeriodsTab.tsx', 'utf8');

// Fix missing space
text = text.replace('{React.createElement("ion-icon", { name: "musical-notes-outline" })} Đổi nhạc\n              {selectedPeriods.length}', '{React.createElement("ion-icon", { name: "musical-notes-outline" })} Đổi nhạc{" "}\n              {selectedPeriods.length}');

// Add optimistic update for bulkToggleActive
text = text.replace(
  'const bulkToggleActive = async (isActive: boolean) => {\n    if (selectedPeriods.length === 0) return;\n    try {\n      await api.post("/api/periods/bulk-update", {',
  'const bulkToggleActive = async (isActive: boolean) => {\n    if (selectedPeriods.length === 0) return;\n    setPeriods(periods.map((item: any) => selectedPeriods.includes(item.id) ? { ...item, isActive } : item));\n    try {\n      await api.post("/api/periods/bulk-update", {'
);

// Fallback for bulkToggleActive if Prettier changed formatting
text = text.replace(
  'const bulkToggleActive = async (isActive: boolean) => {\n      if (selectedPeriods.length === 0) return;\n      try {\n        await api.post("/api/periods/bulk-update", {',
  'const bulkToggleActive = async (isActive: boolean) => {\n      if (selectedPeriods.length === 0) return;\n      setPeriods(periods.map((item: any) => selectedPeriods.includes(item.id) ? { ...item, isActive } : item));\n      try {\n        await api.post("/api/periods/bulk-update", {'
);

// Add optimistic update for toggleSingleActive
text = text.replace(
  'const toggleSingleActive = async (p: any) => {\n    try {\n      await api.put(/api/periods/, { ...p, isActive: !p.isActive });',
  'const toggleSingleActive = async (p: any) => {\n    setPeriods(periods.map((item: any) => item.id === p.id ? { ...item, isActive: !p.isActive } : item));\n    try {\n      await api.put(/api/periods/, { ...p, isActive: !p.isActive });'
);

// Fallback for toggleSingleActive
text = text.replace(
  'const toggleSingleActive = async (p: any) => {\n      try {\n        await api.put(/api/periods/+p.id, { ...p, isActive: !p.isActive });', // wait, template literal
  'const toggleSingleActive = async (p: any) => {\n      setPeriods(periods.map((item: any) => item.id === p.id ? { ...item, isActive: !p.isActive } : item));\n      try {\n        await api.put(/api/periods/+p.id, { ...p, isActive: !p.isActive });'
);

fs.writeFileSync('frontend/src/components/admin/PeriodsTab.tsx', text, 'utf8');