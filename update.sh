#!/bin/bash

echo "🚀 Đang tự động dọn dẹp & cập nhật mã nguồn mới nhất từ GitHub..."
git fetch origin main 2>/dev/null || true
git reset --hard origin/main 2>/dev/null || true

chmod +x *.sh 2>/dev/null || true

echo "📦 Cập nhật và Build Frontend..."
cd frontend
npm install
npm run build
cd ..

echo "🛠️ Cập nhật & Biên dịch Backend..."
cd backend
npm install
npx prisma generate
npx prisma db push
npx tsc
cd ..

echo "🔄 Khởi động lại Server (PM2)..."
cd backend
npx pm2 restart autobells || npx pm2 start npm --name "autobells" -- run start
cd ..

echo "✅ Cập nhật hệ thống thành công 100%!"
