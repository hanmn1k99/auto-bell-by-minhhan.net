const fs = require('fs');
let text = fs.readFileSync('frontend/src/AdminPage.tsx', 'utf8');

const newEffect = \
  useEffect(() => {
    const tabNames = {
      dashboard: 'T?ng Quan',
      files: 'Kho Luu Tr?',
      youtube: 'YouTube',
      schedules: 'Playlist',
      system: 'H? Th?ng'
    };
    
    let tabName = tabNames[tab] || 'Dashboard';
    if (tab === 'system') {
       if (systemSubTab === 'profile') tabName = 'H? so Co quan';
       else if (systemSubTab === 'users') tabName = 'Ngu?i Dùng';
       else if (systemSubTab === 'devices') tabName = 'Thi?t B? Ð?u Cu?i';
    } else if (tab === 'bells') {
       const curProfile = ORG_PROFILES[orgMode] || ORG_PROFILES.GENERAL;
       tabName = curProfile.tabLabel;
    } else if (tab === 'departments') {
       const curProfile = ORG_PROFILES[orgMode] || ORG_PROFILES.GENERAL;
       tabName = curProfile.departmentLabel;
    }
    
    document.title = \\\\\\ - Automation Audio System\\\;
  }, [tab, systemSubTab, orgMode]);
\;

text = text.replace(/useEffect\(\(\) => \{\s*\/\/ Removed localStorage saving to prevent confusing position behavior\s*\}, \[tab\]\);/, newEffect);
text = text.replace(/document\.title = 'AAS \\\| Dashboard';/g, '');
text = text.replace(/document\.title = 'Dashboard - Automation Audio System \\\| minhhan\.net';/g, '');

fs.writeFileSync('frontend/src/AdminPage.tsx', text, 'utf8');
