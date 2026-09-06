const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/admin/YouTubeTab.tsx', 'utf8');

const suggRegex = /<div style=\{\{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: "4px", background: "#1e293b", border: "1px solid var\(--border\)", borderRadius: "8px", zIndex: 50, overflow: "hidden", boxShadow: "0 10px 25px -5px rgba\(0, 0, 0, 0\.5\)" \}\}>/;
const suggNew = `<div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: "4px", background: "var(--sidebar-bg)", border: "1px solid var(--border)", borderRadius: "8px", zIndex: 9999, overflowY: "auto", maxHeight: "400px", boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)" }}>`;

code = code.replace(suggRegex, suggNew);
fs.writeFileSync('frontend/src/components/admin/YouTubeTab.tsx', code, 'utf8');