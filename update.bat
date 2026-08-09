@echo off
chcp 65001 >nul
echo 🚀 Đang tự động dọn dẹp & cập nhật mã nguồn mới nhất từ GitHub...
git fetch origin main 2>nul
git reset --hard origin/main 2>nul

echo 📦 Cập nhật và Build Frontend...
cd frontend
call npm install
call npm run build
cd ..

echo 🛠️ Cập nhật & Biên dịch Backend...
cd backend
call npm install
call npx prisma generate
call npx prisma db push
call npx tsc
cd ..

echo 🔄 Khởi động lại Server (PM2)...
cd backend
call npx pm2 restart autobells || call npx pm2 start npm --name "autobells" -- run start
cd ..

echo ✅ Cập nhật hệ thống thành công 100%!
pause
