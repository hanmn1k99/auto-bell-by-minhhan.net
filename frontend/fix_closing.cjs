const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/admin/Files.tsx', 'utf8');

// The file currently has:
//               </div>
//             </div>
//   
//           <div className="card-header" style={{ flexWrap: 'wrap', gap: '0.75rem', paddingTop: 0 }}>

code = code.replace(/<\/div>\s*<\/div>\s*<div className="card-header" style=\{\{ flexWrap: 'wrap', gap: '0.75rem', paddingTop: 0 \}\}>/, '</div>\n          <div className="card-header" style={{ flexWrap: \'wrap\', gap: \'0.75rem\', paddingTop: 0 }}>');

fs.writeFileSync('frontend/src/components/admin/Files.tsx', code, 'utf8');
console.log("Done");