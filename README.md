# AutoBells by minhhan.net

Hệ thống âm thanh tự động (AutoBells) dành cho trường học.
- Quản lý lịch phát theo playlist.
- Phát nhạc trực tiếp trên thiết bị đầu cuối qua WebSockets.
- Quản lý chuông báo riêng biệt cho cấp Tiểu học và Trung học.
- Giao diện quản trị hiện đại.

## Yêu Cầu Hệ Thống (Ubuntu Server)
- Node.js (phiên bản 18 hoặc 20+)
- npm
- PM2 (để chạy ứng dụng ngầm)
- Cloudflare Tunnel (để kết nối domain)

## Hướng Dẫn Cài Đặt (Trên Máy Tính Windows - Localhost)

Nếu bạn muốn chạy hệ thống trực tiếp trên máy tính Windows trong mạng nội bộ (hoặc làm máy chủ phát thanh của trường):

### Bước 1: Chuẩn bị Môi Trường (Windows)
1. Tải và cài đặt **Node.js** (Bản LTS) tại [nodejs.org](https://nodejs.org/).
2. Tải mã nguồn bằng cách nhấn nút **Code -> Download ZIP** trên GitHub, sau đó giải nén ra một thư mục (ví dụ: `C:\AutoBells`).
3. Mở Command Prompt (CMD) hoặc PowerShell và di chuyển vào thư mục vừa giải nén:
   ```cmd
   cd C:\AutoBells
   ```

### Bước 2: Cấu hình biến môi trường
Tạo file `.env` trong thư mục `backend` bằng cách copy file `.env.example` (nếu có) hoặc tạo file mới bằng Notepad với nội dung:
```env
PORT=1093
DATABASE_URL="file:./dev.db"
JWT_SECRET="changeme_super_secret_key"
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="your_secure_password_here"
```

### Bước 3: Cài đặt và Build Frontend
Chạy lần lượt các lệnh sau trong CMD:
```cmd
cd frontend
npm install
npm run build
```

### Bước 4: Cài đặt Backend và Khởi chạy
Mở một cửa sổ CMD mới (hoặc tiếp tục từ CMD cũ):
```cmd
cd ../backend
npm install
npx prisma generate
npx prisma migrate deploy
npm run seed
```

**Khởi chạy hệ thống:**
```cmd
npm start
```
*Lưu ý: Màn hình CMD này cần được mở liên tục để hệ thống hoạt động. Bạn có thể sử dụng [PM2 cho Windows](https://github.com/jessety/pm2-installer) nếu muốn chạy ngầm tự động cùng Windows.*

### Bước 5: Sử Dụng Trên Mạng Nội Bộ (LAN)
Trên chính máy tính Windows đó, mở trình duyệt:
- Giao diện Player: `http://localhost:1093`
- Giao diện Admin: `http://localhost:1093/admin`

Để các máy tính hoặc điện thoại khác trong cùng mạng Wi-Fi truy cập được, hãy tìm địa chỉ IP IPv4 của máy Windows (ví dụ: `192.168.1.50`) bằng lệnh `ipconfig`. Sau đó, dùng các thiết bị khác truy cập:
- `http://192.168.1.50:1093`

---

## Hướng Dẫn Cài Đặt

### Bước 1: Chuẩn bị Môi Trường
Cập nhật hệ thống và cài đặt Node.js, PM2:
```bash
sudo apt update
sudo apt install -y curl
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

### Bước 2: Tải Source Code
```bash
git clone https://github.com/hanmn1k99/auto-bell-by-minhhan.net.git
cd auto-bell-by-minhhan.net
```

### Bước 3: Cấu hình biến môi trường
Tạo file `.env` trong thư mục `backend`:
```bash
cd backend
nano .env
```
Nội dung file `.env`:
```env
PORT=1093
DATABASE_URL="file:./dev.db"
JWT_SECRET="changeme_super_secret_key"
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="your_secure_password_here"
```

### Bước 4: Cài đặt và Build Frontend
Hệ thống được thiết kế để Frontend và Backend chạy chung trên 1 cổng (Port 1093). Backend sẽ tự động phục vụ các file giao diện của Frontend.
```bash
cd ../frontend
npm install
npm run build
```

### Bước 5: Cài đặt Backend và Khởi chạy
```bash
cd ../backend
npm install
npx prisma generate
npx prisma migrate deploy

# Chạy seed để khởi tạo tài khoản admin (sẽ sử dụng thông tin từ file .env)
npm run seed

# Chạy server với PM2
pm2 start npm --name "autobells" -- run start
pm2 save
pm2 startup
```

### Bước 6: Cấu hình Cloudflare Tunnel
Trong giao diện quản lý Cloudflare Zero Trust, cấu hình Public Hostname trỏ về local service như sau:
- **Service Type:** `HTTP`
- **URL:** `localhost:1093`

## Sử Dụng Hệ Thống
- Trang chủ (Thiết bị phát âm thanh): `https://bell.minhhan.net`
- Trang đăng nhập quản trị: `https://bell.minhhan.net/login`
- Trang quản trị: `https://bell.minhhan.net/admin`

Chúc bạn sử dụng phần mềm hiệu quả!
