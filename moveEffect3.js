const fs = require('fs');
let text = fs.readFileSync('frontend/src/AdminPage.tsx', 'utf8');

const startIdx = text.indexOf('useEffect(() => {');
const searchStr = 'const tabNames: Record<string, string> = {';

let currentIdx = 0;
while (true) {
  const effectIdx = text.indexOf('useEffect(() => {', currentIdx);
  if (effectIdx === -1) break;
  if (text.substring(effectIdx, effectIdx + 200).includes(searchStr)) {
     const endIdx = text.indexOf('}, [tab, systemSubTab, orgMode]);', effectIdx) + 33;
     const snippet = text.substring(effectIdx, endIdx);
     text = text.replace(snippet, '');
     text = text.replace('  // 🎵 HOISTED HOOKS 🎵', snippet + '\n\n  // 🎵 HOISTED HOOKS 🎵');
     fs.writeFileSync('frontend/src/AdminPage.tsx', text, 'utf8');
     break;
  }
  currentIdx = effectIdx + 10;
}