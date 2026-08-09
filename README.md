# 🔔 AutoBells

<div align="center">
  <img src="https://img.shields.io/badge/Node.js-18+-green?style=for-the-badge&logo=nodedotjs" alt="Node.js" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white" alt="Socket.io" />
  <img src="https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite" />
  <img src="https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/Cloudflare-F38020?style=for-the-badge&logo=cloudflare&logoColor=white" alt="Cloudflare" />
  <br/>
  <img src="https://img.shields.io/badge/Author-Nguy%E1%BB%85n%20Minh%20H%C3%A2n-blueviolet?style=for-the-badge&logo=github" alt="Author" />
</div>

**AutoBells** là hệ thống phần mềm quản lý, phát nhạc và báo chuông tự động đa thiết bị qua mạng nội bộ hoặc Internet. Được thiết kế chuyên biệt cho môi trường **Trường học**, **Doanh nghiệp**, **Nhà xưởng** và **Siêu thị**, AutoBells giúp tối ưu hóa việc quản lý thời gian và thông báo một cách hoàn toàn tự động, tập trung và mạnh mẽ.

Hệ thống cho phép một máy chủ trung tâm (Quản trị viên) điều khiển việc phát âm thanh đồng bộ theo thời gian thực tới tất cả các thiết bị thu/phát (Player) như Smart TV, loa thông minh, máy tính, hoặc điện thoại di động mà không cần đi dây vật lý phức tạp.

---

## 🌟 Tính năng Nổi bật

### 1. Đồng bộ hóa Thời gian thực (Real-time Sync)
- Ứng dụng công nghệ **WebSockets**, mọi lệnh điều khiển (Phát, Tạm dừng, Tua, Tăng/Giảm âm lượng) từ bảng điều khiển lập tức phản hồi tới tất cả thiết bị Player trên hệ thống với độ trễ gần như bằng không.
- Hỗ trợ MiniPlayer giúp Quản trị viên theo dõi trạng thái phát nhạc thực tế đang diễn ra trên toàn hệ thống một cách trực quan.

### 2. Tích hợp Trình phát YouTube & Trích xuất MP3
- **Phát Video YouTube Trực tiếp:** Dán link YouTube hoặc tìm kiếm trực tiếp trên bảng điều khiển để phát Video/Nhạc lên tất cả màn hình (Smart TV) hoặc hệ thống âm thanh.
- **Tự động xử lý:** Hệ thống tự chặn quảng cáo, xử lý lỗi tự động bỏ qua video hỏng, có khả năng Bật/Tắt phụ đề (CC) từ xa.
- **Trích xuất MP3:** Hỗ trợ tính năng tải và tách âm thanh MP3 từ link YouTube đưa thẳng vào Kho dữ liệu nội bộ với tốc độ cao.

### 3. Quản lý Lên lịch Thông minh (Smart Scheduler)
- **Lên lịch (Scheduler):** Tự động phát Playlist hoặc Chuông báo (Bells) theo ngày, thứ và khung giờ cố định.
- **Hiệu ứng Fade-in:** Hỗ trợ cấu hình âm lượng tăng dần khi bắt đầu phát nhạc, tránh làm giật mình học sinh/nhân viên trong môi trường yên tĩnh.
- **Lên lịch hàng loạt (Bulk Edit):** Hỗ trợ công cụ tạo tự động 10 - 20 tiết học/ca làm việc cùng lúc chỉ bằng một cú click, tự động tính toán thời gian nghỉ giải lao và thời gian vào lớp.
- Tính năng tính toán thời gian tự động tránh tình trạng trùng lặp giờ (Conflict Prevention).

### 4. Hệ thống Âm thanh Đa Vùng (Multi-Zone Audio) & Ducking
- Gửi âm thanh độc lập tới các **Khu vực (Zones)** khác nhau (ví dụ: phát nhạc nhẹ ở Hành lang, phát thông báo ở Xưởng 1).
- **Audio Ducking:** Khi có chuông báo thức hoặc thông báo khẩn cấp, hệ thống tự động làm giảm âm lượng (Ducking) của nhạc nền đang phát, và khôi phục âm lượng sau khi thông báo kết thúc.

### 5. Quản lý Thiết bị Hiện đại (Device Management)
- Các thiết bị truy cập vào hệ thống phát nhạc phải được Quản trị viên **"Duyệt"** mới có thể nhận tín hiệu âm thanh.
- Nhận diện thiết bị qua vân tay trình duyệt (Browser Fingerprinting) & IP.
- Hệ thống tự động khóa tạm thời nếu có dấu hiệu Spam, và tự động thu hồi quyền thiết bị sau 7 ngày để đảm bảo an toàn tối đa.

### 6. Phân quyền Người dùng (RBAC)
- **Quản trị viên (Admin):** Toàn quyền cấu hình hệ thống, duyệt thiết bị, quản lý tài khoản.
- **Vận hành (Operator):** Được cấp quyền tải nhạc, tạo danh sách phát, chỉnh chuông và điều khiển phát nhạc nhưng không được can thiệp sâu vào bảo mật.

---

## 🚀 Hướng dẫn Cài đặt & Triển khai

Hệ thống có thể chạy trên mọi hệ điều hành (Windows, Linux, macOS). Cổng kết nối mặc định của hệ thống là **`1093`**.

### 1. Triển khai trên Ubuntu/Linux (Khuyên dùng cho Máy chủ)
Mở Terminal và chạy tuần tự các lệnh sau:

```bash
# Tải mã nguồn về máy
git clone https://github.com/hanmn1k99/auto-bell-by-minhhan.net.git
cd auto-bell-by-minhhan.net

# Cấp quyền chạy cho bộ kịch bản
chmod +x setup.sh update.sh

# Chạy cài đặt tự động
./setup.sh
```

### 2. Triển khai trên Windows
1. Mở **Command Prompt (cmd)** hoặc **PowerShell** bằng quyền **Administrator**.
2. Chạy các lệnh sau:
   ```cmd
   git clone https://github.com/hanmn1k99/auto-bell-by-minhhan.net.git
   cd auto-bell-by-minhhan.net
   setup.bat
   ```
*(Lưu ý: Công cụ tự động cài đặt sẽ tự check và cài Node.js, PM2, cấp quyền đầy đủ giúp bạn)*

### 3. Thiết lập Lần đầu (First-time Setup)
Ngay sau khi cài đặt thành công, truy cập vào đường dẫn quản trị của hệ thống. AutoBells sẽ yêu cầu bạn khởi tạo **Tài khoản Quản trị viên (Admin)** và cung cấp cho bạn một **Mã khôi phục (Recovery Key)**. 
*Lưu ý: Hãy lưu trữ Mã khôi phục thật cẩn thận để lấy lại mật khẩu trong trường hợp quên.*

---

## 🌐 Hướng dẫn Sử dụng (HDSD)

Sau khi khởi động, cổng mặc định của hệ thống là **`1093`**.
Giả sử IP máy chủ của bạn là `192.168.1.100`:

- **📺 TRANG PHÁT NHẠC PLAYER:**
  - Dành cho các thiết bị đóng vai trò là "Loa phát" (Tivi, Loa thông minh, Máy tính ở sảnh, Điện thoại cắm loa ngoài).
  - 👉 Truy cập: **`http://192.168.1.100:1093`**
  - Mở trang này lên và cắm loa, hệ thống sẽ chờ lệnh từ Admin.

- **🎛️ BẢNG ĐIỀU KHIỂN ADMIN:**
  - Dành cho Admin / Vận hành viên để phát nhạc, lên lịch, chỉnh sửa âm lượng.
  - 👉 Truy cập: **`http://192.168.1.100:1093/admin`**
  - Hoặc ấn nút Đăng nhập ở góc trái màn hình trang Player.

---

## ⚙️ Các Lệnh Tiện ích Nâng cao

AutoBells đi kèm với các công cụ CLI mạnh mẽ nằm trong thư mục `backend` để hỗ trợ bảo trì:

```bash
cd auto-bell-by-minhhan.net/backend
```

- **Cấp quyền Admin thủ công:** Dùng để nâng quyền một tài khoản Vận hành hoặc khi mất hết tài khoản Admin.
  ```bash
  npm run make-admin <tên_đăng_nhập>
  ```
- **Xóa trắng Hệ thống (Factory Reset):** Khôi phục hệ thống về trạng thái mới tinh ban đầu. Cảnh báo: Sẽ xóa toàn bộ dữ liệu.
  ```bash
  npm run reset-db
  ```

---

## 🔄 Hướng dẫn Cập nhật (Update)

Khi có bản phát hành tính năng mới trên Github, bạn không cần phải tải lại hoặc xóa đi cài lại. Chỉ cần chạy lệnh sau trên thư mục gốc của dự án:

**Trên Linux/Ubuntu:**
```bash
./update.sh
```

**Trên Windows:**
```cmd
update.bat
```

Hệ thống sẽ tự động kéo (pull) mã nguồn mới nhất, biên dịch lại và khởi động lại dịch vụ một cách liền mạch **mà không làm mất dữ liệu, bài hát hay lịch phát cũ của bạn**.

---

## ☁️ Hỗ trợ Triển khai Đám mây (Cloudflare Proxy)

Khi AutoBells được public ra Internet với tính năng Proxy của Cloudflare (Đám mây màu cam), hệ thống WebSockets yêu cầu cấu hình chuẩn.

**Cấu hình Nginx (Reverse Proxy) tham khảo:**
```nginx
server {
    listen 80;
    server_name bell.truonghoc.edu.vn;

    location / {
        proxy_pass http://127.0.0.1:1093;
        proxy_http_version 1.1;

        # Đặc biệt quan trọng cho kết nối WebSockets
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```

---
*Được thiết kế và phát triển bởi đội ngũ **minhhan.net***
