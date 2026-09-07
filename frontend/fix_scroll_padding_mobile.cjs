const fs = require('fs');
let css = fs.readFileSync('frontend/src/admin.css', 'utf8');

css = css.replace(/@media \(max-width: 768px\) \{\s*\.admin-sidebar/, '@media (max-width: 768px) {\n  .admin-content { padding-top: 1rem; }\n  .admin-sidebar');
css = css.replace(/padding: 1rem;\s*height: auto;/g, 'padding: 0 1rem 1rem 1rem;\n    height: auto;');

fs.writeFileSync('frontend/src/admin.css', css, 'utf8');
console.log("Done");