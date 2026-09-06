const fs = require('fs');
let text = fs.readFileSync('frontend/src/components/admin/PeriodsTab.tsx', 'utf8');

text = text.replace(/\{React\.createElement\("ion-icon", \{ name: "musical-notes-outline" \}\)\} Đổi nhạc\s+\{selectedPeriods/g, '{React.createElement("ion-icon", { name: "musical-notes-outline" })} Đổi nhạc{" "}\n              {selectedPeriods');

text = text.replace(/const bulkToggleActive = async \(isActive: boolean\) => \{\s+if \(selectedPeriods\.length === 0\) return;\s+try \{/g, 'const bulkToggleActive = async (isActive: boolean) => {\n      if (selectedPeriods.length === 0) return;\n      setPeriods(periods.map((item: any) => selectedPeriods.includes(item.id) ? { ...item, isActive } : item));\n      try {');

text = text.replace(/const toggleSingleActive = async \(p: any\) => \{\s+try \{/g, 'const toggleSingleActive = async (p: any) => {\n      setPeriods(periods.map((item: any) => item.id === p.id ? { ...item, isActive: !p.isActive } : item));\n      try {');

fs.writeFileSync('frontend/src/components/admin/PeriodsTab.tsx', text, 'utf8');