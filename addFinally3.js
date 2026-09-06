const fs = require('fs');
let text = fs.readFileSync('frontend/src/components/admin/PeriodsTab.tsx', 'utf8');

text = text.replace(
  /\} catch \{\s+notify\(\Lỗi \$\{isActive \? "bật" : "tắt"\} hàng loạt\, "err"\);\s+\}/g,
  '} catch {\n      notify(Lỗi  hàng loạt, "err");\n    } finally {\n      setIsBulkToggling(false);\n    }'
);

fs.writeFileSync('frontend/src/components/admin/PeriodsTab.tsx', text, 'utf8');