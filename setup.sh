#!/bin/bash
echo "======================================"
echo "  AUTO-BELLS CÀI ĐẶT TỰ ĐỘNG (LINUX/MAC)  "
echo "======================================"

echo "[1/6] Kiểm tra Node.js và PM2..."
if ! command -v node &> /dev/null
then
    echo "Node.js chưa được cài đặt! Đang tiến hành cài đặt Node.js tự động (yêu cầu quyền sudo)..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
    if ! command -v node &> /dev/null; then
        echo "Cài đặt thất bại, vui lòng cài đặt thủ công."
        exit 1
    fi
fi

if ! command -v pm2 &> /dev/null
then
    echo "Cài đặt PM2 toàn cục..."
    npm install -g pm2
fi

echo "[2/6] Cài đặt Frontend & Build..."
cd frontend
npm install
npm run build
cd ..

echo "[3/6] Cài đặt Backend & Database..."
cd backend
npm install
npx prisma generate
npx prisma db push --accept-data-loss

echo "[4/6] Khởi tạo file .env mẫu (nếu chưa có)..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "Đã tạo file .env! Bạn có thể chỉnh sửa cổng (PORT) hoặc tài khoản admin ở file backend/.env"
else
    echo "File .env đã tồn tại, giữ nguyên cấu hình."
fi

echo "[5/6] Khởi động Server (PM2)..."
npx pm2 start npm --name "autobells" -- run start

echo "======================================"
echo "✅ Cài đặt thành công!"
echo "Server đang chạy ngầm bằng PM2."
echo "Bạn có thể kiểm tra trạng thái bằng lệnh: npx pm2 status"
echo "======================================"
