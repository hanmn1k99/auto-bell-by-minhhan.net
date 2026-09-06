const fs = require('fs');
let text = fs.readFileSync('frontend/src/AdminPage.tsx', 'utf8');

// Replace the empty [tab] useEffect
const newEffect = \
  useEffect(() => {
    const tabNames: Record<string, string> = {
      dashboard: 'Tổng Quan',
      files: 'Kho Lưu Trữ',
      youtube: 'YouTube',
      schedules: 'Playlist',
      system: 'Hệ Thống'
    };
    
    let tabName = tabNames[tab] || 'Dashboard';
    if (tab === 'system') {
       if (systemSubTab === 'profile') tabName = 'Hồ sơ Cơ quan';
       else if (systemSubTab === 'users') tabName = 'Người Dùng';
       else if (systemSubTab === 'devices') tabName = 'Thiết Bị Đầu Cuối';
    } else if (tab === 'bells') {
       const curProfile = ORG_PROFILES[orgMode] || ORG_PROFILES.GENERAL;
       tabName = curProfile.tabLabel;
    } else if (tab === 'departments') {
       const curProfile = ORG_PROFILES[orgMode] || ORG_PROFILES.GENERAL;
       tabName = curProfile.departmentLabel;
    }
    
    document.title = \\\\ - Automation Audio System\\\;
  }, [tab, systemSubTab, orgMode]);
\;

text = text.replace(
  /useEffect\(\(\) => \{\s*\/\/ Removed localStorage saving to prevent confusing position behavior\s*\}, \[tab\]\);/,
  newEffect
);

// Remove the other document.title setters
text = text.replace(/document\.title = 'AAS \| Dashboard';/g, '');
text = text.replace(/document\.title = 'Dashboard - Automation Audio System \| minhhan\.net';/g, '');

fs.writeFileSync('frontend/src/AdminPage.tsx', text, 'utf8');