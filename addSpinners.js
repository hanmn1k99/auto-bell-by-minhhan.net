const fs = require('fs');
let text = fs.readFileSync('frontend/src/components/admin/PeriodsTab.tsx', 'utf8');

text = text.replace(
  'const toggleSingleActive = async (p: any) => {\n      setPeriods(periods.map((item: any) => item.id === p.id ? { ...item, isActive: !p.isActive } : item));\n      try {\n      await api.put(/api/periods/+p.id, { ...p, isActive: !p.isActive });', // wait! it was template literal.
  'const toggleSingleActive = async (p: any) => {\n      setTogglingIds(prev => [...prev, p.id]);\n      setPeriods(periods.map((item: any) => item.id === p.id ? { ...item, isActive: !p.isActive } : item));\n      try {\n      await api.put(/api/periods/+p.id, { ...p, isActive: !p.isActive });'
); // this regex is tricky because of the backticks. I will use regex matching in node.

text = text.replace(/const toggleSingleActive = async \(p: any\) => \{\s+setPeriods\(periods\.map\(\(item: any\) => item\.id === p\.id \? \{ \.\.\.item, isActive: !p\.isActive \} : item\)\);\s+try \{/g, 'const toggleSingleActive = async (p: any) => {\n      setTogglingIds(prev => [...prev, p.id]);\n      setPeriods(periods.map((item: any) => item.id === p.id ? { ...item, isActive: !p.isActive } : item));\n      try {');

text = text.replace(/notify\("Lỗi bật\/tắt tiết", "err"\);\s+\}/g, 'notify("Lỗi bật/tắt tiết", "err");\n      fetchPeriods();\n    } finally {\n      setTogglingIds(prev => prev.filter(id => id !== p.id));\n    }');


text = text.replace(/const bulkToggleActive = async \(isActive: boolean\) => \{\s+if \(selectedPeriods\.length === 0\) return;\s+setPeriods\(periods\.map\(\(item: any\) => selectedPeriods\.includes\(item\.id\) \? \{ \.\.\.item, isActive \} : item\)\);\s+try \{/g, 'const bulkToggleActive = async (isActive: boolean) => {\n      if (selectedPeriods.length === 0) return;\n      setIsBulkToggling(true);\n      setPeriods(periods.map((item: any) => selectedPeriods.includes(item.id) ? { ...item, isActive } : item));\n      try {');

text = text.replace(/fetchPeriods\(\);\n\s+notify\(\n\s+Đã \$\{isActive \? "bật" : "tắt"\} \$\{selectedPeriods\.length\} \$\{curProfile\.itemUnit\}!,\n\s+\);\n\s+\} catch \{\n\s+notify\(Lỗi \$\{isActive \? "bật" : "tắt"\} hàng loạt, "err"\);\n\s+\}/g, 'fetchPeriods();\n        notify(Đã   !);\n      } catch {\n        notify(Lỗi  hàng loạt, "err");\n        fetchPeriods();\n      } finally {\n        setIsBulkToggling(false);\n      }');

fs.writeFileSync('frontend/src/components/admin/PeriodsTab.tsx', text, 'utf8');