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
- Nginx (để phục vụ web và proxy domain)

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

### Bước 3: Cài đặt Backend
```bash
cd backend
npm install
# Khởi tạo database và tạo tài khoản admin mặc định (admin / admin123)
npx prisma generate
npx prisma migrate deploy
npm run seed
```

### Bước 4: Cài đặt và Build Frontend
```bash
cd ../frontend
npm install
# Thay đổi URL API nếu bạn chạy trên domain thực tế (nếu cần). Mặc định là gọi về origin.
npm run build
```

### Bước 5: Chạy Backend bằng PM2
```bash
cd ../backend
# Chạy backend trên port 3001
pm2 start npm --name "autobells-backend" -- run start
# Lưu cấu hình PM2 để tự động chạy khi khởi động lại server
pm2 save
pm2 startup
```

### Bước 6: Cấu Hình Nginx (Ví dụ với domain bell.minhhan.net)
Tạo file cấu hình Nginx:
```bash
sudo nano /etc/nginx/sites-available/autobells
```
Nội dung file:
```nginx
server {
    listen 80;
    server_name bell.minhhan.net;

    # Thư mục chứa code frontend đã build
    root /path/to/auto-bell-by-minhhan.net/frontend/dist;
    index index.html;

    # Phục vụ Frontend React (SPA)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API và Uploads/Assets qua Backend (Port 3001)
    location ~ ^/(api|uploads|assets)/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Proxy Socket.IO
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```
Kích hoạt site và khởi động lại Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/autobells /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Đăng nhập
Truy cập trang quản trị tại: `http://bell.minhhan.net/admin/login`
- **Tài khoản mặc định:** `admin`
- **Mật khẩu:** `admin123`

Chúc bạn sử dụng phần mềm hiệu quả!
