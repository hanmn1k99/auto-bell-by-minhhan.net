# 🔔 AutoBells by minhhan.net

AutoBells là một hệ thống quản lý, phát nhạc và báo chuông tự động đa thiết bị qua mạng nội bộ hoặc Internet. Hệ thống cho phép một máy chủ trung tâm (Admin) điều khiển việc phát âm thanh đồng bộ theo thời gian thực tới tất cả các "thiết bị phát" (Player) được kết nối và cấp quyền.

Giao diện hoàn toàn mới được thiết kế phẳng, hiện đại với bộ biểu tượng **Ionicons**, cùng hiệu ứng đĩa than xoay động cực kỳ bắt mắt.

## 🌟 Công năng nổi bật

1. **Phát nhạc & Báo chuông thời gian thực (Real-time Sync):** 
   - Tất cả các thiết bị phát nhạc sẽ nhận lệnh và phát âm thanh đồng bộ gần như ngay lập tức thông qua công nghệ WebSocket (Socket.io).
2. **Quản lý thiết bị an toàn (Device Management):**
   - Các thiết bị kết nối vào trang phát nhạc sẽ phải đợi Admin "Duyệt" mới có thể nhận lệnh phát âm thanh.
   - **Tự động gia hạn & Hết hạn:** ID thiết bị tự động hết hạn sau 7 ngày để đảm bảo an toàn.
   - **Chống Spam (Anti-Spam):** Nhận diện thiết bị qua IP & Trình duyệt (Browser Fingerprinting). Bị khóa tạm thời nếu request quá số lần cho phép. Đồng hồ đếm ngược hiển thị trực quan cho người dùng.
3. **Quản lý File & Playlist (Media Management):**
   - Tải lên tệp âm thanh định dạng phổ biến, hệ thống tự động đọc thời lượng.
   - Nhóm các bài nhạc thành Playlist để lên lịch phát liên tục.
   - **Hàng đợi phát nhạc (Queue):** Tính năng "Thêm vào hàng đợi" (Up Next) cho phép Admin tạo ra một danh sách phát nhạc tạm thời nhanh chóng mà không cần tạo Playlist cố định.
4. **Lên lịch tự động (Scheduler):**
   - Lên lịch phát Playlist hoặc Chuông báo (Bells) tự động theo giờ và các ngày cụ thể trong tuần.
   - Phân biệt trực quan Chuông Tiểu học và Chuông Trung học.
5. **Điều khiển linh hoạt & Giám sát trực quan:**
   - Admin có thể ấn Play, Pause, Seek (tua), chỉnh âm lượng tổng hoặc âm lượng riêng cho từng Playlist theo thời gian thực.
   - Giao diện Admin tích hợp MiniPlayer xem trước âm thanh và đĩa than xoay thời gian thực hiển thị trạng thái phát hiện tại.

---

## 🚀 Hướng dẫn Cài đặt

### Yêu cầu hệ thống ban đầu:
- **Git** (Dùng để clone mã nguồn từ Github về máy).
- *Lưu ý: Hệ thống yêu cầu Node.js (bản 18+) và PM2, nhưng script cài đặt tự động của chúng tôi sẽ **tự động cài đặt** nếu máy bạn chưa có.*

### 1. Trên Ubuntu Server (Khuyên dùng)

1. **Clone mã nguồn:**
   ```bash
   git clone https://github.com/hanmn1k99/auto-bell-by-minhhan.net.git
   cd auto-bell-by-minhhan.net
   ```

2. **Cấu hình biến môi trường (Mẫu file .env):**
   Hệ thống tự động tạo file `backend/.env` khi chạy script cài đặt. Mẫu cấu hình:
   ```env
   # Port chạy hệ thống
   PORT=3001

   # Cơ sở dữ liệu SQLite
   DATABASE_URL="file:./dev.db"

   # Chuỗi bí mật dùng để mã hóa phiên đăng nhập
   JWT_SECRET="changeme_super_secret_key"

   # Tài khoản đăng nhập trang quản trị (Admin)
   ADMIN_USERNAME="admin"

   # Mật khẩu đăng nhập trang quản trị
   ADMIN_PASSWORD="your_secure_password_here"
   ```

3. **Triển khai tự động chỉ với 1 lệnh:**
   Cấp quyền chạy và khởi chạy file setup:
   ```bash
   chmod +x setup.sh
   ./setup.sh
   ```
   *Script tự động cài đặt Node.js, PM2, Node modules, build Frontend, tạo cơ sở dữ liệu và khởi động hệ thống qua PM2.*

### 2. Trên Windows

1. **Tải mã nguồn:**
   - Yêu cầu máy tính đã cài đặt Git cho Windows.
   - Mở Command Prompt (quyền Administrator):
     ```cmd
     git clone https://github.com/hanmn1k99/auto-bell-by-minhhan.net.git
     cd auto-bell-by-minhhan.net
     ```
2. **Cài đặt Tự động:**
   - Chạy lệnh `setup.bat`. Script sẽ dùng `winget` cài Node.js, cài PM2, khởi tạo Database, build Frontend và tự động chạy server nền.

---

## 🌐 Liên kết truy cập & Sử dụng

Sau khi khởi động, hệ thống sẽ chạy trên cổng (PORT) cấu hình trong `backend/.env` (VD: `3001` hoặc `1093`).

Giả sử IP máy chủ của bạn là `192.168.1.100` và PORT là `1093`:

- **Trình phát nhạc (Player - Dành cho thiết bị phát):**
  - Truy cập: `http://192.168.1.100:1093`
  - Các thiết bị như Tivi, loa thông minh chỉ cần mở link, tương tác một lần để cho phép phát âm thanh. Giao diện Player được tối ưu hoàn hảo cho cả màn hình Desktop và Mobile.

- **Quản trị viên (Admin Panel):**
  - Truy cập: `http://192.168.1.100:1093/admin`
  - Đăng nhập bằng tài khoản và mật khẩu từ `.env`.

---

## ☁️ Cấu hình qua Cloudflare (Truy cập Internet)

Nếu đưa hệ thống ra Internet qua tên miền (vd: `bell.minhhan.net`) với lớp bảo vệ Proxy (Đám mây màu cam) của Cloudflare, bạn **CẦN** tuân thủ các quy tắc Port của Cloudflare do Cloudflare chỉ chuyển tiếp WebSockets qua các cổng cố định.

### Cách 1: Đổi trực tiếp PORT trong `.env`
Mở `backend/.env` và đổi `PORT` thành một cổng Cloudflare hỗ trợ:
- **HTTP:** `80`, `8080`, `8880`, `2052`, `2082`, `2086`, `2095`
- **HTTPS:** `443`, `2053`, `2083`, `2087`, `2096`, `8443`

### Cách 2: Dùng Nginx làm Reverse Proxy (Khuyên dùng)
Dùng Nginx đứng ra hứng port `80`/`443` và chuyển tiếp ngược vào `1093`. Cấu hình `server` block mẫu:
```nginx
server {
    listen 80;
    server_name bell.minhhan.net;

    location / {
        proxy_pass http://127.0.0.1:1093;
        proxy_http_version 1.1;
        
        # Đặc biệt quan trọng để WebSockets (Socket.io) hoạt động qua Cloudflare
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```

---
*Phát triển bởi đội ngũ minhhan.net*
