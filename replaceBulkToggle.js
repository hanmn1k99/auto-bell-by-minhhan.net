const fs = require('fs');
let text = fs.readFileSync('frontend/src/components/admin/PeriodsTab.tsx', 'utf8');

const regex = /const bulkToggleActive = async \([^]*?\} catch \{\s+notify\([^]*?,\s+"err"\);\s+\}\s+\};/;

const replacement = \const bulkToggleActive = async (isActive: boolean) => {
      if (selectedPeriods.length === 0) return;
      setIsBulkToggling(true);
      setPeriods(periods.map((item: any) => selectedPeriods.includes(item.id) ? { ...item, isActive } : item));
      try {
      await api.post("/api/periods/bulk-update", {
        ids: selectedPeriods,
        isActive,
      });
      fetchPeriods();
      notify(
        \\\Đã \ \ \!\\\,
      );
    } catch {
      notify(\\\Lỗi \ hàng loạt\\\, "err");
      fetchPeriods();
    } finally {
      setIsBulkToggling(false);
    }
  };\;

text = text.replace(regex, replacement);

fs.writeFileSync('frontend/src/components/admin/PeriodsTab.tsx', text, 'utf8');