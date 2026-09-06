const fs = require('fs');
let text = fs.readFileSync('frontend/src/AdminPage.tsx', 'utf8');

text = text.replace(
  'let TABS = [\n      { key: \'dashboard\', icon: \'stats-chart-outline\', label: \'Tổng Quan\' },',
  '// 👇 HƯỚNG DẪN SỬA TÊN MENU BÊN TRÁI:\n    // Bạn có thể sửa chữ trong thuộc tính label để đổi tên menu.\n    // Nếu muốn đổi icon, lấy tên icon từ trang ionicons.com\n    let TABS = [\n      { key: \'dashboard\', icon: \'stats-chart-outline\', label: \'Tổng Quan\' }, // <-- Sửa tên tại đây'
);

text = text.replace(
  '{ key: \'files\', icon: \'folder-outline\', label: \'Kho Lưu Trữ\' },',
  '{ key: \'files\', icon: \'folder-outline\', label: \'Kho Lưu Trữ\' }, // <-- Sửa tên tại đây'
);

text = text.replace(
  '{ key: \'youtube\', icon: \'logo-youtube\', label: \'YouTube\' },',
  '{ key: \'youtube\', icon: \'logo-youtube\', label: \'YouTube\' }, // <-- Sửa tên tại đây'
);

text = text.replace(
  '{ key: \'schedules\', icon: \'calendar-outline\', label: \'Playlist\' },',
  '{ key: \'schedules\', icon: \'calendar-outline\', label: \'Playlist\' }, // <-- Sửa tên tại đây'
);

text = text.replace(
  '{ key: \'bells\', icon: curProfile.icon, label: curProfile.tabLabel },\n      { key: \'departments\', icon: curProfile.departmentIcon || \'grid-outline\', label: curProfile.departmentLabel }',
  '// 👇 Tên của 2 menu bên dưới được lấy tự động theo loại hình cơ quan (Trường học, Văn phòng...)\n      // Nếu muốn sửa chữ cố định, có thể đổi thành: label: \'Tên tự đặt\'\n      { key: \'bells\', icon: curProfile.icon, label: curProfile.tabLabel },\n      { key: \'departments\', icon: curProfile.departmentIcon || \'grid-outline\', label: curProfile.departmentLabel }'
);

fs.writeFileSync('frontend/src/AdminPage.tsx', text, 'utf8');