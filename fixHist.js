const fs = require('fs');
let text = fs.readFileSync('frontend/src/components/admin/YouTubeTab.tsx', 'utf8');

const oldHistCode = 'const newHist = [query.trim(), ...searchHistory.filter(h => h !== query.trim())].slice(0, 10);\n    setSearchHistory(newHist);\n    localStorage.setItem("ytSearchHistory", JSON.stringify(newHist));';

const newHistCode = 'const newHist = [query.trim(), ...searchHistory.filter(h => h !== query.trim())].slice(0, 10);\n    setSearchHistory(newHist);\n    try { localStorage.setItem("ytSearchHistory", JSON.stringify(newHist)); } catch(e) {}';

text = text.replace(oldHistCode, newHistCode);
fs.writeFileSync('frontend/src/components/admin/YouTubeTab.tsx', text, 'utf8');