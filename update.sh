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

echo "🔄 Đang dừng Server cũ (nếu có) để an toàn cập nhật DB..."
cd backend
npx pm2 stop autobell 2>/dev/null || true
npx pm2 delete autobell 2>/dev/null || true
npx pm2 stop autobells 2>/dev/null || true
npx pm2 delete autobells 2>/dev/null || true
npx pm2 delete autobells-api 2>/dev/null || true

echo "🛠️ Cập nhật & Biên dịch Backend..."
npm install
npx prisma generate
npx prisma db push --accept-data-loss
npx tsc
cd ..

echo "🔄 Khởi động lại Server (PM2)..."
cd backend
npx pm2 restart autobells || npx pm2 start npm --name "autobells" -- run start
cd ..

echo "✅ Cập nhật hệ thống thành công 100%!"
