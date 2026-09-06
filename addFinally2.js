const fs = require('fs');
let text = fs.readFileSync('frontend/src/components/admin/PeriodsTab.tsx', 'utf8');

text = text.replace(
  '} catch {\n      notify(Lỗi  hàng loạt, "err");\n    }',
  '} catch {\n      notify(Lỗi  hàng loạt, "err");\n    } finally {\n      setIsBulkToggling(false);\n    }'
);
text = text.replace(
  '} catch {\r\n      notify(Lỗi  hàng loạt, "err");\r\n    }',
  '} catch {\r\n      notify(Lỗi  hàng loạt, "err");\r\n    } finally {\r\n      setIsBulkToggling(false);\r\n    }'
);

fs.writeFileSync('frontend/src/components/admin/PeriodsTab.tsx', text, 'utf8');