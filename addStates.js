const fs = require('fs');
let text = fs.readFileSync('frontend/src/components/admin/PeriodsTab.tsx', 'utf8');

text = text.replace(
  'const padT = (s: string) => s.padStart(2, "0");',
  'const [togglingIds, setTogglingIds] = useState<number[]>([]);\n  const [isBulkToggling, setIsBulkToggling] = useState(false);\n  const padT = (s: string) => s.padStart(2, "0");'
);

fs.writeFileSync('frontend/src/components/admin/PeriodsTab.tsx', text, 'utf8');