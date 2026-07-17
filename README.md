# 🔔 AutoBells by minhhan.net

**AutoBells** là hệ thống quản lý, phát nhạc và báo chuông tự động đa thiết bị qua mạng nội bộ hoặc Internet, được thiết kế chuyên biệt cho môi trường trường học, doanh nghiệp và nhà xưởng. 

Hệ thống cho phép một máy chủ trung tâm (Quản trị viên) điều khiển việc phát âm thanh đồng bộ theo thời gian thực tới tất cả các thiết bị thu/phát (Player) được kết nối.

Với giao diện Dark Mode (Chế độ tối) tinh tế, sang trọng, cùng công nghệ **PWA (Progressive Web App)** tiên tiến, AutoBells mang đến trải nghiệm điều khiển âm thanh chuyên nghiệp như một ứng dụng Native đích thực.

---

## 🌟 Công năng & Tính năng nổi bật

### 1. Phân quyền Người dùng (RBAC - Role-Based Access Control)
- Hệ thống hỗ trợ đa người dùng với 2 cấp độ phân quyền rõ ràng:
  - **Quản trị viên (Admin):** Toàn quyền cấu hình, phê duyệt thiết bị, quản lý người dùng, cài đặt hệ thống.
  - **Vận hành (Operator):** Chỉ được phép tải nhạc, tạo danh sách phát, chỉnh chuông và điều khiển phát nhạc. Không được quyền can thiệp vào bảo mật hay quản lý thiết bị/tài khoản.

### 2. Thiết lập Lần đầu & Bảo mật Khóa khôi phục (Recovery Key)
- Loại bỏ hoàn toàn việc cấu hình tài khoản qua file `.env`. Lần đầu khởi chạy, hệ thống yêu cầu thiết lập tài khoản Admin trực tiếp qua giao diện.
- **Recovery Key:** Cung cấp mã khôi phục duy nhất cho Admin ngay khi thiết lập. Nếu quên mật khẩu, Admin có thể tự khôi phục thông qua tính năng "Quên mật khẩu" an toàn ở trang đăng nhập.

### 3. Đồng bộ hóa Thời gian thực (Real-time Sync)
- Ứng dụng công nghệ **WebSockets (Socket.io)**, mọi lệnh (Play, Pause, Tua, Tăng/Giảm âm lượng) từ bảng điều khiển đều lập tức phản hồi tới tất cả thiết bị Player.
- Giao diện Admin tích hợp MiniPlayer xem trước và Đĩa than xoay hiển thị trạng thái nhạc hiện tại.

### 4. Quản lý Thiết bị thông minh (Device Management)
- Các thiết bị truy cập vào hệ thống phải được Admin **"Duyệt"** mới có thể nhận lệnh phát nhạc.
- Nhận diện thiết bị qua cấu hình IP & Trình duyệt. Khóa tạm thời nếu có dấu hiệu Spam. Tự động thu hồi quyền thiết bị sau 7 ngày.

### 5. Quản lý Đa phương tiện & Lên lịch (Media & Scheduler)
- Nhóm các bản nhạc thành Playlist, lên lịch phát tự động vào các ngày/giờ cụ thể trong tuần.
- **Fade-in / Crossfade:** Hỗ trợ cấu hình âm lượng tăng dần (Fade-in) khi bắt đầu phát, tạo cảm giác mượt mà và không bị giật mình.
- Hàng đợi ưu tiên (Up Next) cho phép xếp hàng nhạc phát tạm thời ngay lập tức.

### 6. PWA (Tiến trình Ứng dụng Web)
- AutoBells được đóng gói dưới dạng PWA. Người dùng có thể ấn **"Cài đặt (Install)"** hoặc **"Thêm vào màn hình chính"** trên điện thoại/máy tính để trải nghiệm như một ứng dụng độc lập mượt mà, hỗ trợ icon tùy biến do người dùng upload.

---

## 🚀 Hướng dẫn Cài đặt & Triển khai

### 1. Yêu cầu hệ thống ban đầu
- Máy chủ (Linux/Ubuntu hoặc Windows).
- **Git** (để tải mã nguồn).
- *(Không cần cài thủ công Node.js/PM2, bộ cài tự động sẽ làm mọi việc).*

### 2. Triển khai trên Ubuntu/Linux (Khuyên dùng)
Mở Terminal và chạy tuần tự các lệnh sau:

```bash
# Clone mã nguồn về máy
git clone https://github.com/hanmn1k99/auto-bell-by-minhhan.net.git
cd auto-bell-by-minhhan.net

# Cấp quyền chạy cho bộ cài đặt
chmod +x setup.sh update.sh

# Chạy setup tự động (Cài đặt môi trường, Database, Build giao diện)
./setup.sh
```

### 3. Triển khai trên Windows
1. Mở Command Prompt bằng quyền **Administrator**.
2. Clone mã nguồn:
   ```cmd
   git clone https://github.com/hanmn1k99/auto-bell-by-minhhan.net.git
   cd auto-bell-by-minhhan.net
   ```
3. Chạy lệnh cài đặt tự động `setup.bat`. Nó sẽ tự tải `Node.js`, `PM2`, cài đặt các dependencies và chạy server ở chế độ nền.

---

## ⚙️ Các Lệnh Quản trị Nâng cao

Chúng tôi cung cấp sẵn một số lệnh tiện ích để khắc phục sự cố hoặc bảo trì hệ thống. Để chạy, bạn truy cập vào thư mục `backend` bằng Terminal:

```bash
cd auto-bell-by-minhhan.net/backend
```

- **Cấp quyền Admin thủ công:** Dành cho trường hợp bạn lỡ tay xóa hết Admin hoặc cần nâng quyền một tài khoản Vận hành.
  ```bash
  npm run make-admin <tên_đăng_nhập>
  ```
- **Xóa trắng Hệ thống (Factory Reset):** Xóa toàn bộ tài khoản, thiết bị, log và cài đặt (Trở về trạng thái Thiết lập Lần đầu). *Cực kỳ cẩn thận khi dùng.*
  ```bash
  npm run reset-db
  ```

---

## 🔄 Cập nhật Hệ thống

Khi có bản cập nhật tính năng mới từ minhhan.net, bạn chỉ cần chạy lệnh sau trên thư mục gốc:

```bash
./update.sh
```
Hệ thống sẽ tự động kéo code mới nhất (`git pull`), cài lại dependencies, đồng bộ Database và khởi động lại dịch vụ mà không làm gián đoạn hệ thống.

---

## 🌐 Liên kết truy cập

Sau khi khởi động, cổng mặc định của hệ thống là `1093` (Bạn có thể đổi trong `backend/.env`).
Giả sử IP máy chủ là `192.168.1.100`:

- **Trang phát nhạc (Dành cho Tivi, Loa thông minh, Điện thoại...):**
  - 👉 `http://192.168.1.100:1093`
- **Bảng điều khiển & Quản trị (Dành cho Admin / Vận hành):**
  - 👉 `http://192.168.1.100:1093/admin`
  - Hoặc ấn nút Đăng nhập ở góc trái màn hình trang Player.

---

## ☁️ Cấu hình truy cập Internet qua Cloudflare

Nếu bạn muốn kết nối các chi nhánh ở xa qua tên miền (Vd: `bell.truonghoc.edu.vn`) và có bật Proxy Cloudflare, bạn **BẮT BUỘC** phải tuân thủ chuẩn WebSockets của Cloudflare.

**Khuyên dùng Nginx (Reverse Proxy):**
```nginx
server {
    listen 80;
    server_name bell.truonghoc.edu.vn;

    location / {
        proxy_pass http://127.0.0.1:1093;
        proxy_http_version 1.1;

        # Đặc biệt quan trọng để Hệ thống đồng bộ WebSockets không bị đứt kết nối
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```

---
*Phát triển và bảo trì độc quyền bởi đội ngũ **minhhan.net***
