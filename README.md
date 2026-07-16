# AutoBells by minhhan.net

AutoBells là một hệ thống quản lý, phát nhạc và báo chuông tự động đa thiết bị qua mạng nội bộ hoặc Internet. Hệ thống cho phép một máy chủ trung tâm (Admin) điều khiển việc phát âm thanh đồng bộ theo thời gian thực tới tất cả các "thiết bị phát" (Player) được kết nối và cấp quyền.

## 🌟 Công năng nổi bật

1. **Phát nhạc & Báo chuông thời gian thực (Real-time Sync):** 
   - Tất cả các thiết bị phát nhạc sẽ nhận lệnh và phát âm thanh đồng bộ gần như ngay lập tức thông qua công nghệ WebSocket (Socket.io).
2. **Quản lý thiết bị an toàn (Device Management):**
   - Các thiết bị kết nối vào trang phát nhạc sẽ phải đợi Admin "Duyệt" mới có thể nhận lệnh phát âm thanh.
   - **Tự động gia hạn & Hết hạn:** ID thiết bị tự động hết hạn sau 7 ngày để đảm bảo an toàn.
   - **Chống Spam (Anti-Spam):** Nhận diện thiết bị qua IP & Trình duyệt (Browser Fingerprinting). Nếu bị Admin từ chối kết nối 10 lần, khóa thiết bị 24h. Cố tình spam thêm 3 lần, khóa tiếp 48h. Đồng hồ đếm ngược hiển thị trực quan cho người dùng.
3. **Quản lý File & Playlist (Media Management):**
   - Tải lên tệp âm thanh định dạng phổ biến, hệ thống tự động đọc thời lượng (duration).
   - Nhóm các bài nhạc thành Playlist để lên lịch phát liên tục.
4. **Lên lịch tự động (Scheduler):**
   - Lên lịch phát Playlist hoặc Chuông báo (Bells) theo giờ và các ngày cụ thể trong tuần.
5. **Điều khiển linh hoạt:**
   - Admin có thể ấn Play, Pause, Seek (tua), chỉnh âm lượng tổng hoặc âm lượng riêng cho từng Playlist theo thời gian thực. Bất kỳ thay đổi nào cũng được áp dụng ngay lập tức xuống toàn bộ các thiết bị con.

---

## 🚀 Hướng dẫn Cài đặt

### Yêu cầu hệ thống ban đầu:
- **Git** (Dùng để clone mã nguồn từ Github về máy).
- *Lưu ý: Hệ thống yêu cầu Node.js (bản 18+) và PM2, nhưng script tự động của chúng tôi sẽ **tự động cài đặt** nếu máy bạn chưa có.*

### 1. Trên Ubuntu Server (Khuyên dùng)

1. **Clone mã nguồn:**
   ```bash
   git clone https://github.com/hanmn1k99/auto-bell-by-minhhan.net.git
   cd auto-bell-by-minhhan.net
   ```

3. **Cấu hình biến môi trường (Mẫu file .env):**
   - Hệ thống tự động tạo file `backend/.env` khi bạn chạy script cài đặt. Dưới đây là nội dung mẫu cấu hình:
   ```env
   # Port chạy hệ thống (Nếu dùng qua Cloudflare Proxy, hãy dùng các port hỗ trợ như 8080, 8443... hoặc dùng Nginx proxy ngược)
   PORT=3001

   # Cơ sở dữ liệu SQLite
   DATABASE_URL="file:./dev.db"

   # Chuỗi bí mật dùng để mã hóa phiên đăng nhập (Khuyến cáo nên đổi)
   JWT_SECRET="changeme_super_secret_key"

   # Tài khoản đăng nhập trang quản trị (Admin)
   ADMIN_USERNAME="admin"

   # Mật khẩu đăng nhập trang quản trị
   ADMIN_PASSWORD="your_secure_password_here"
   ```

4. **Triển khai tự động chỉ với 1 lệnh:**
   - Cấp quyền chạy và khởi chạy file setup:
     ```bash
     chmod +x setup.sh
     ./setup.sh
     ```
   - Script này sẽ tự động: Kiểm tra & cài đặt Node.js (nếu thiếu), cài đặt PM2, cài đặt các Node modules, build Frontend, tạo cơ sở dữ liệu SQLite, tạo file `.env` mẫu và khởi động hệ thống qua PM2.

### 2. Trên Windows

1. **Tải mã nguồn:**
   - Yêu cầu máy tính đã cài đặt [Git cho Windows](https://git-scm.com/download/win).
   - Mở Command Prompt hoặc PowerShell dưới quyền **Administrator**.
   - Clone mã nguồn:
     ```cmd
     git clone https://github.com/hanmn1k99/auto-bell-by-minhhan.net.git
     cd auto-bell-by-minhhan.net
     ```
2. **Cài đặt Tự động với Setup File:**
   - Chỉ cần nhấp đúp vào file `setup.bat` trong thư mục gốc.
   - Hoặc gõ lệnh trong Command Prompt:
     ```cmd
     setup.bat
     ```
   - Script sẽ tự động:
     - Dùng `winget` để cài đặt Node.js (nếu máy bạn chưa có). Trong trường hợp cài mới Node.js, script sẽ tạm dừng và yêu cầu bạn mở lại cửa sổ CMD mới để nhận diện lệnh.
     - Tự động cài đặt PM2.
     - Tự động tải thư viện, build web, khởi tạo Database, cấp file `.env` mẫu.
     - Chạy server nền bằng PM2 cho bạn.
   - *Lưu ý: Bạn có thể mở file `backend/.env` để chỉnh sửa lại thông tin tài khoản và Port nếu cần.*

---

## 🌐 Liên kết truy cập & Sử dụng

Sau khi khởi động thành công, hệ thống sẽ lắng nghe trên cổng (PORT) được cấu hình trong file `backend/.env` (Mặc định trong mã nguồn là `1093` hoặc `3001`). 

Giả sử IP máy chủ của bạn là `192.168.1.100` và PORT là `1093`:

- **Giao diện người dùng (Trình phát nhạc / Player):**
  - Truy cập: `http://192.168.1.100:1093`
  - Các thiết bị như Tivi, Loa thông minh, Máy tính bảng nội bộ chỉ cần mở link này, cho phép phát âm thanh và giữ màn hình luôn sáng.

- **Giao diện Quản trị viên (Admin Panel):**
  - Truy cập: `http://192.168.1.100:1093/admin`
  - Đăng nhập bằng `ADMIN_USERNAME` và `ADMIN_PASSWORD` từ file `.env`.

---

## ☁️ Cấu hình qua Cloudflare (Dành cho truy cập qua Internet)

Nếu bạn muốn mở hệ thống AutoBells ra ngoài Internet bằng tên miền (ví dụ: `bell.minhhan.net`) và dùng lớp bảo vệ Proxy (Đám mây màu cam) của Cloudflare, bạn **BẮT BUỘC** phải tuân thủ các quy tắc về Port của Cloudflare.

Cloudflare Proxy **chỉ hỗ trợ chuyển tiếp WebSockets và HTTP** qua một số cổng nhất định. Nếu PORT trong `.env` của bạn là `1093`, Cloudflare sẽ không chuyển tiếp tín hiệu!

### Cách 1: Đổi trực tiếp PORT trong `.env`
Bạn có thể mở `backend/.env` và đổi `PORT` thành một trong các cổng được Cloudflare hỗ trợ:
- **Hỗ trợ HTTP:** `80`, `8080`, `8880`, `2052`, `2082`, `2086`, `2095`
- **Hỗ trợ HTTPS:** `443`, `2053`, `2083`, `2087`, `2096`, `8443`

*Ví dụ:* Sửa `.env` thành `PORT=8080`. Lúc này trên Cloudflare bạn trỏ DNS về IP máy chủ và có thể truy cập qua `http://bell.minhhan.net:8080`.

### Cách 2: Dùng Nginx làm Reverse Proxy (Khuyên dùng cho máy chủ chuyên nghiệp)
Cách này cho phép bạn giữ nguyên `PORT=1093` cho AutoBells, dùng Nginx đứng ra hứng port `80` (hoặc `443`) và chuyển tiếp ngược vào `1093`.
- Trên Cloudflare, trỏ tên miền (ví dụ: `bell.minhhan.net`) về IP máy chủ, bật Đám mây vàng (Proxy).
- Trên Ubuntu server cài đặt Nginx và tạo một cấu hình `server` block như sau:
  ```nginx
  server {
      listen 80;
      server_name bell.minhhan.net;

      location / {
          proxy_pass http://127.0.0.1:1093;
          proxy_http_version 1.1;
          
          # 3 dòng dưới đây đặc biệt quan trọng để WebSockets (Socket.io) hoạt động qua Cloudflare
          proxy_set_header Upgrade $http_upgrade;
          proxy_set_header Connection "Upgrade";
          proxy_set_header Host $host;
      }
  }
  ```
- Bằng cách này, người dùng và thiết bị phát chỉ cần truy cập bằng link sạch: `http://bell.minhhan.net` (hoặc HTTPS do Cloudflare tự cấp).

---
*Phát triển bởi đội ngũ minhhan.net*
