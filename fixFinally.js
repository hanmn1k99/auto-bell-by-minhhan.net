const fs = require('fs');
let text = fs.readFileSync('frontend/src/components/admin/PeriodsTab.tsx', 'utf8');
const search = '    } catch {\r\n      notify(Lỗi \ hàng loạt, "err");\r\n    }';
const replacement = '    } catch {\r\n      notify(Lỗi \ hàng loạt, "err");\r\n    } finally {\r\n      setIsBulkToggling(false);\r\n    }';

const search2 = '    } catch {\n      notify(Lỗi \ hàng loạt, "err");\n    }';
const replacement2 = '    } catch {\n      notify(Lỗi \ hàng loạt, "err");\n    } finally {\n      setIsBulkToggling(false);\n    }';

if (text.includes(search)) text = text.replace(search, replacement);
else if (text.includes(search2)) text = text.replace(search2, replacement2);

fs.writeFileSync('frontend/src/components/admin/PeriodsTab.tsx', text, 'utf8');