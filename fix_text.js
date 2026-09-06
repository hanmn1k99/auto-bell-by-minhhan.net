const fs = require('fs');
let text = fs.readFileSync('frontend/src/components/admin/PeriodsTab.tsx', 'utf8');

text = text.replace(/\{React\.createElement\("ion-icon", \{ name: "pencil-outline" \}\)\} S?a\s+hàng lo?t/g, '{React.createElement("ion-icon", { name: "musical-notes-outline" })} Ð?i nh?c\\n              hàng lo?t');

text = text.replace(/name: "pencil-outline",\s+style: \{ marginRight: "4px" \},\s+\}\)\}\{" "\}\s+S?a hàng lo?t/g, 'name: "musical-notes-outline",\\n                    style: { marginRight: "4px" },\\n                  })}{" "}\\n                  Ð?i nh?c hàng lo?t');

fs.writeFileSync('frontend/src/components/admin/PeriodsTab.tsx', text, 'utf8');
