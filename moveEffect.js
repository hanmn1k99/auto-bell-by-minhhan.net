const fs = require('fs');
let text = fs.readFileSync('frontend/src/AdminPage.tsx', 'utf8');

const effectMatch = text.match(/useEffect\(\(\) => \{\n    const tabNames: Record<string, string> = \{[\s\S]*?\}, \[tab, systemSubTab, orgMode\]\);\n/);
if (effectMatch) {
  text = text.replace(effectMatch[0], '');
  text = text.replace(
    '  // 🎵 HOISTED HOOKS 🎵',
    effectMatch[0] + '\n  // 🎵 HOISTED HOOKS 🎵'
  );
  fs.writeFileSync('frontend/src/AdminPage.tsx', text, 'utf8');
}