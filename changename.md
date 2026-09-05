# HƯỚNG DẪN ĐỔI TÊN MENU (SIDEBAR)

Bạn có thể tự đổi tên và biểu tượng của thanh menu bên trái bằng cách sửa mã nguồn trong tệp tin:
**\rontend/src/AdminPage.tsx\**

## Các bước thực hiện:

1. Mở tệp tin \rontend/src/AdminPage.tsx\.
2. Tìm đến dòng **815** (hoặc tìm kiếm từ khóa \let TABS = [\).
3. Tại đây, bạn sẽ thấy cấu hình của các menu:
   \\\	sx
   let TABS = [
     { key: 'dashboard', icon: 'stats-chart-outline', label: 'Tổng Quan' }, // <-- Sửa tên tại đây
     { key: 'files', icon: 'folder-outline', label: 'Kho Lưu Trữ' }, // <-- Sửa tên tại đây
     // ...
   ]
   \\\
4. Để đổi tên hiển thị, bạn chỉ cần thay đổi chữ nằm trong thuộc tính \label\ (ví dụ: đổi \'Kho Lưu Trữ'\ thành \'Thư Viện'\).
5. Nếu bạn muốn đổi biểu tượng (icon), hãy vào trang [Ionicons](https://ionic.io/ionicons) để lấy tên icon mới, sau đó thay vào thuộc tính \icon\.
6. Lưu file lại. Do hệ thống có chế độ Hot-Reload, thay đổi sẽ hiển thị ngay lập tức mà không cần khởi động lại.

**⚠️ Lưu ý đặc biệt đối với menu Mốc Giờ và Khu Vực:**
Hai menu này sử dụng biến động (\curProfile\) để tự động thay đổi tên dựa trên loại hình cơ quan bạn chọn (Trường học, Văn phòng...).
- Nếu bạn muốn đặt một cái tên cố định vĩnh viễn, bạn có thể xóa biến đi và gõ chữ vào. 
- Ví dụ: \label: 'Phòng ban'\ thay vì \label: curProfile.departmentLabel\.

---
*Chúc bạn thành công!*