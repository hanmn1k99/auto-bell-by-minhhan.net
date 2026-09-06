const fs = require('fs');
let css = fs.readFileSync('frontend/src/admin.css', 'utf8');

css = css.replace(/\.card\s*\{[\s\S]*?overflow:\s*hidden;[\s\S]*?\}/g, match => match.replace('overflow: hidden;', '/* overflow: hidden; */'));

fs.writeFileSync('frontend/src/admin.css', css, 'utf8');