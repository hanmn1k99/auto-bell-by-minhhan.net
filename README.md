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

**AutoBells** là hệ thống phần mềm quản lý, phát nhạc và báo chuông tự động đa thiết bị qua mạng nội bộ hoặc Internet. Được thiết kế chuyên biệt cho môi trường trường học, doanh nghiệp và nhà xưởng, AutoBells giúp tối ưu hóa việc quản lý thời gian và thông báo một cách hoàn toàn tự động.

Hệ thống cho phép một máy chủ trung tâm (Quản trị viên) điều khiển việc phát âm thanh đồng bộ theo thời gian thực tới tất cả các thiết bị thu/phát (Player) như Smart TV, loa thông minh, máy tính, hoặc điện thoại.

---

## 🌟 Tính năng Hệ thống

### 1. Đồng bộ hóa Thời gian thực (Real-time Sync)
- Ứng dụng công nghệ **WebSockets**, mọi lệnh điều khiển (Phát, Tạm dừng, Tua, Tăng/Giảm âm lượng) từ bảng điều khiển lập tức phản hồi tới tất cả thiết bị Player với độ trễ gần như bằng không.
- Hỗ trợ MiniPlayer xem trước và hiển thị trạng thái phát nhạc thực tế đang diễn ra trên toàn hệ thống.

### 2. Quản lý Đa phương tiện & Lên lịch (Media & Scheduler)
- **Tải lên & Quản lý File:** Quản lý kho nhạc, âm thanh thông báo.
- **Danh sách phát (Playlist):** Phân nhóm các bài nhạc để phát liên tục. Hỗ trợ hàng đợi ưu tiên (Up Next) để chèn nhạc phát ngay lập tức.
- **Lên lịch (Scheduler):** Tự động phát Playlist hoặc Chuông báo (Bells) theo ngày và khung giờ cố định trong tuần.
- **Hiệu ứng Fade-in:** Hỗ trợ cấu hình âm lượng tăng dần khi bắt đầu phát nhạc, tránh gây giật mình trong môi trường yên tĩnh.

### 3. Phân quyền Người dùng (RBAC)
Hệ thống hỗ trợ quản lý đa người dùng với 2 cấp độ phân quyền:
- **Quản trị viên (Admin):** Toàn quyền cấu hình, phê duyệt thiết bị, quản lý người dùng và cài đặt cốt lõi của hệ thống.
- **Vận hành (Operator):** Được cấp quyền tải nhạc, tạo danh sách phát, chỉnh chuông và điều khiển phát nhạc. Không có quyền can thiệp vào bảo mật hay quản lý thiết bị/tài khoản.

### 4. Quản lý Thiết bị Hiện đại (Device Management)
- Các thiết bị truy cập vào hệ thống phát nhạc phải được Quản trị viên **"Duyệt"** mới có thể nhận tín hiệu âm thanh.
- Nhận diện thiết bị qua vân tay trình duyệt (Browser Fingerprinting) & IP. Hệ thống tự động khóa tạm thời nếu có dấu hiệu Spam, và tự động thu hồi quyền thiết bị sau 7 ngày để đảm bảo an toàn tối đa.

### 5. Progressive Web App (PWA)
- AutoBells hỗ trợ chuẩn PWA, cho phép cài đặt hệ thống như một ứng dụng Native độc lập trên máy tính, điện thoại, máy tính bảng chỉ với một cú nhấp chuột (Add to Homescreen).

---

## 🚀 Hướng dẫn Cài đặt & Triển khai

### 1. Yêu cầu hệ thống ban đầu
- Máy chủ chạy hệ điều hành Linux/Ubuntu (Khuyên dùng) hoặc Windows.
- **Git** (để tải mã nguồn).
- Không yêu cầu cài đặt thủ công các phần mềm như Node.js hay PM2, kịch bản cài đặt tự động (Setup Script) của AutoBells sẽ xử lý toàn bộ.

### 2. Triển khai trên Ubuntu/Linux (Khuyên dùng)
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

### 3. Triển khai trên Windows
1. Mở **Command Prompt** bằng quyền **Administrator**.
2. Chạy các lệnh sau:
   ```cmd
   git clone https://github.com/hanmn1k99/auto-bell-by-minhhan.net.git
   cd auto-bell-by-minhhan.net
   setup.bat
   ```

### 4. Thiết lập Lần đầu (First-time Setup)
Ngay sau khi cài đặt thành công, truy cập vào đường dẫn quản trị của hệ thống. AutoBells sẽ yêu cầu bạn khởi tạo Tài khoản Quản trị viên (Admin) và cung cấp cho bạn một **Mã khôi phục (Recovery Key)**. 
*Lưu ý: Hãy lưu trữ Mã khôi phục thật cẩn thận để lấy lại mật khẩu trong trường hợp cần thiết.*

---

## 🌐 Truy cập Hệ thống

Sau khi khởi động, cổng mặc định của hệ thống là `1093`.
Giả sử IP máy chủ của bạn là `192.168.1.100`:

- **Trang phát nhạc (Dành cho Tivi, Loa thông minh, Điện thoại, PC):**
  - 👉 `http://192.168.1.100:1093`
- **Bảng điều khiển & Quản trị (Dành cho Admin / Vận hành):**
  - 👉 `http://192.168.1.100:1093/admin`
  - Hoặc ấn nút Đăng nhập ở góc trái màn hình trang Player.

---

## ⚙️ Các Lệnh Tiện ích

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

## 🔄 Cập nhật Hệ thống

Khi có bản phát hành mới, bạn chỉ cần chạy lệnh sau trên thư mục gốc của dự án:

```bash
./update.sh
```
Hệ thống sẽ tự động tải mã nguồn mới nhất, cập nhật thư viện, đồng bộ cơ sở dữ liệu và khởi động lại dịch vụ một cách liền mạch.

---

## ☁️ Hỗ trợ Triển khai Đám mây (Cloudflare Proxy)

Khi AutoBells được public ra Internet với tính năng Proxy của Cloudflare (Đám mây màu cam), hệ thống WebSockets yêu cầu cầu hình chuẩn.

**Khuyên dùng Nginx (Reverse Proxy):**
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
*Phát triển bởi đội ngũ **minhhan.net***
