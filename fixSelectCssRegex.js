const fs = require('fs');
let css = fs.readFileSync('frontend/src/admin.css', 'utf8');
css = css.replace(/\.input option\s*\{[\s\S]*?\}/, (match) => {
  return match + "\n.input optgroup {\n  background: var(--sidebar-bg);\n  color: var(--text-muted);\n  font-weight: 600;\n  font-style: normal;\n}";
});
fs.writeFileSync('frontend/src/admin.css', css, 'utf8');