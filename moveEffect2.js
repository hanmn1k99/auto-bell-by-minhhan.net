const fs = require('fs');
let text = fs.readFileSync('frontend/src/AdminPage.tsx', 'utf8');

const effectIndex = text.indexOf('useEffect(() => {\n    const tabNames: Record<string, string> = {');
if (effectIndex !== -1) {
  const effectEnd = text.indexOf('  }, [tab, systemSubTab, orgMode]);', effectIndex) + 35;
  const effectStr = text.substring(effectIndex, effectEnd);
  
  text = text.replace(effectStr, '');
  text = text.replace(
    '  // 🎵 HOISTED HOOKS 🎵',
    effectStr + '\n\n  // 🎵 HOISTED HOOKS 🎵'
  );
  fs.writeFileSync('frontend/src/AdminPage.tsx', text, 'utf8');
}