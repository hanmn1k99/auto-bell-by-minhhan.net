const fs = require('fs');
let css = fs.readFileSync('frontend/src/admin.css', 'utf8');

// Replace padding: 2rem; in .admin-main
css = css.replace(/\.admin-main \{\s*flex: 1;\s*padding: 2rem;/, '.admin-main {\n    flex: 1;\n    padding: 0 2rem 2rem 2rem;');
css = css.replace(/\.admin-main \{\s*padding: 2rem;/, '.admin-main {\n    padding: 0 2rem 2rem 2rem;');

// Check if we need to add padding-top to .admin-content
if (css.indexOf('.admin-content {') === -1) {
    css += '\n.admin-content {\n    padding-top: 2rem;\n    width: 100%;\n}\n';
}

// For mobile, .admin-main has padding: 1rem;
css = css.replace(/@media \(max-width: 768px\) \{\s*\.admin-main \{\s*flex: 1;\s*padding: 1rem;/, '@media (max-width: 768px) {\n  .admin-main {\n      flex: 1;\n      padding: 0 1rem 1rem 1rem;');
// And we should adjust .admin-content padding-top for mobile
css += '\n@media (max-width: 768px) {\n  .admin-content {\n      padding-top: 1rem;\n  }\n}\n';

fs.writeFileSync('frontend/src/admin.css', css, 'utf8');
console.log("Done");