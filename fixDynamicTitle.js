const fs = require('fs');
let text = fs.readFileSync('frontend/src/AdminPage.tsx', 'utf8');

// 1. Delete old useEffect
const effectStart = text.indexOf('useEffect(() => {\n    const tabNames: Record<string, string> = {');
if (effectStart !== -1) {
  const effectEnd = text.indexOf('}, [tab, systemSubTab, orgMode]);', effectStart) + 33;
  text = text.substring(0, effectStart) + text.substring(effectEnd);
}

// 2. Delete old TABS
const tabsStart = text.indexOf('  // 👇 HƯỚNG DẪN SỬA TÊN MENU BÊN TRÁI:');
if (tabsStart !== -1) {
  const tabsEnd = text.indexOf('TABS.push({ key: \'system\', icon: \'settings-outline\', label: \'Hệ Thống\' });', tabsStart) + 74;
  text = text.substring(0, tabsStart) + text.substring(tabsEnd);
}

// 3. Insert new TABS and new useEffect after curProfile
const curProfileStr = 'const curProfile = ORG_PROFILES[orgMode] || ORG_PROFILES.GENERAL;';
const curProfileIdx = text.indexOf(curProfileStr);

if (curProfileIdx !== -1) {
  const insertPos = curProfileIdx + curProfileStr.length;
  const newCode = \

  // 👇 HƯỚNG DẪN SỬA TÊN MENU BÊN TRÁI:
  // Bạn có thể sửa chữ trong thuộc tính label để đổi tên menu.
  // Nếu muốn đổi icon, lấy tên icon từ trang ionicons.com
  let TABS = React.useMemo(() => {
    const tabs = [
      { key: 'dashboard', icon: 'stats-chart-outline', label: 'Tổng Quan' }, // <-- Sửa tên tại đây
      { key: 'files', icon: 'folder-outline', label: 'Kho Lưu Trữ' }, // <-- Sửa tên tại đây
      { key: 'youtube', icon: 'logo-youtube', label: 'YouTube' }, // <-- Sửa tên tại đây
      { key: 'schedules', icon: 'calendar-outline', label: 'Playlist' }, // <-- Sửa tên tại đây
      // 👇 Tên của 2 menu bên dưới được tự động lấy theo loại hình cơ quan
      // Nếu muốn đổi cố định, bạn có thể sửa lại thành: label: 'Tên tự đặt'
      { key: 'bells', icon: curProfile.icon, label: curProfile.tabLabel },
      { key: 'departments', icon: curProfile.departmentIcon || 'grid-outline', label: curProfile.departmentLabel }
    ] as any[];
    if (userRole === 'ADMIN') {
      tabs.push({ key: 'system', icon: 'settings-outline', label: 'Hệ Thống' });
    }
    return tabs;
  }, [curProfile, userRole]);

  useEffect(() => {
    let tabName = 'Dashboard';
    const activeTab = TABS.find(t => t.key === tab);
    if (activeTab) tabName = activeTab.label;
    
    if (tab === 'system') {
       if (systemSubTab === 'profile') tabName = 'Hồ sơ Cơ quan';
       else if (systemSubTab === 'users') tabName = 'Người Dùng';
       else if (systemSubTab === 'devices') tabName = 'Thiết Bị Đầu Cuối';
    }
    document.title = \\\\ - Automation Audio System\\\;
  }, [tab, systemSubTab, TABS]);
\;
  text = text.substring(0, insertPos) + newCode + text.substring(insertPos);
}

fs.writeFileSync('frontend/src/AdminPage.tsx', text, 'utf8');