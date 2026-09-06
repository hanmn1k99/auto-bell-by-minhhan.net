const fs = require('fs');
let text = fs.readFileSync('frontend/src/components/admin/PeriodsTab.tsx', 'utf8');

// For bulk Bật
text = text.replace(
  /\{React\.createElement\("ion-icon", \{\s*name: isBulkToggling \? "sync-outline" : "power-outline",\s*className: isBulkToggling \? "spin" : "",\s*style: \{ marginRight: "4px" \},\s*\}\)\}/,
  '<span className={isBulkToggling ? "spin" : ""} style={{ display: "inline-flex", alignItems: "center", marginRight: "4px" }}>\n                  {React.createElement("ion-icon", {\n                    name: isBulkToggling ? "sync-outline" : "power-outline",\n                  })}\n                </span>'
);

// For bulk Tắt
text = text.replace(
  /\{React\.createElement\("ion-icon", \{\s*name: isBulkToggling \? "sync-outline" : "power-outline",\s*className: isBulkToggling \? "spin" : "",\s*style: \{ marginRight: "4px" \},\s*\}\)\}/,
  '<span className={isBulkToggling ? "spin" : ""} style={{ display: "inline-flex", alignItems: "center", marginRight: "4px" }}>\n                  {React.createElement("ion-icon", {\n                    name: isBulkToggling ? "sync-outline" : "power-outline",\n                  })}\n                </span>'
);

// For single toggle
text = text.replace(
  /\{React\.createElement\("ion-icon", \{\s*name: togglingIds\.includes\(p\.id\) \? "sync-outline" : \(p\.isActive \? "toggle" : "toggle-outline"\),\s*className: togglingIds\.includes\(p\.id\) \? "spin" : "",\s*style: \{ marginRight: "4px" \},\s*\}\)\}/,
  '<span className={togglingIds.includes(p.id) ? "spin" : ""} style={{ display: "inline-flex", alignItems: "center", marginRight: "4px" }}>\n                            {React.createElement("ion-icon", {\n                              name: togglingIds.includes(p.id) ? "sync-outline" : (p.isActive ? "toggle" : "toggle-outline"),\n                            })}\n                          </span>'
);

fs.writeFileSync('frontend/src/components/admin/PeriodsTab.tsx', text, 'utf8');