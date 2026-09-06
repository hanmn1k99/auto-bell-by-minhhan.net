const fs = require('fs');
let text = fs.readFileSync('frontend/src/components/admin/PeriodsTab.tsx', 'utf8');

text = text.replace(/name: "power-outline",/g, 'name: isBulkToggling ? "sync-outline" : "power-outline", className: isBulkToggling ? "spin" : "",');

text = text.replace(/name: p\.isActive \? "toggle" : "toggle-outline",/g, 'name: togglingIds.includes(p.id) ? "sync-outline" : (p.isActive ? "toggle" : "toggle-outline"), className: togglingIds.includes(p.id) ? "spin" : "",');

// Also update the buttons to be disabled when loading
text = text.replace(/onClick=\{\(\) => bulkToggleActive\(true\)\}/g, 'onClick={() => bulkToggleActive(true)} disabled={isBulkToggling}');
text = text.replace(/onClick=\{\(\) => bulkToggleActive\(false\)\}/g, 'onClick={() => bulkToggleActive(false)} disabled={isBulkToggling}');
text = text.replace(/onClick=\{\(\) => toggleSingleActive\(p\)\}/g, 'onClick={() => toggleSingleActive(p)} disabled={togglingIds.includes(p.id)}');

fs.writeFileSync('frontend/src/components/admin/PeriodsTab.tsx', text, 'utf8');