const fs = require('fs');
let text = fs.readFileSync('frontend/src/components/admin/PeriodsTab.tsx', 'utf8');

text = text.replace(
  'fetchPeriods();\n      notify(\n        Đã   !,\n      );\n    } catch {\n      notify(Lỗi  hàng loạt, "err");\n    }',
  'fetchPeriods();\n      notify(\n        Đã   !,\n      );\n    } catch {\n      notify(Lỗi  hàng loạt, "err");\n      fetchPeriods();\n    } finally {\n      setIsBulkToggling(false);\n    }'
);
// In case windows line endings
text = text.replace(
  'fetchPeriods();\r\n      notify(\r\n        Đã   !,\r\n      );\r\n    } catch {\r\n      notify(Lỗi  hàng loạt, "err");\r\n    }',
  'fetchPeriods();\r\n      notify(\r\n        Đã   !,\r\n      );\r\n    } catch {\r\n      notify(Lỗi  hàng loạt, "err");\r\n      fetchPeriods();\r\n    } finally {\r\n      setIsBulkToggling(false);\r\n    }'
);

fs.writeFileSync('frontend/src/components/admin/PeriodsTab.tsx', text, 'utf8');