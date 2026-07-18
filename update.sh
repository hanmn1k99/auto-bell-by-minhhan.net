#!/bin/bash

echo "Đang cập nhật mã nguồn từ GitHub..."
git pull origin main

echo "Cập nhật và Build Frontend..."
cd frontend
npm install
npm run build
cd ..

echo "Cập nhật Backend..."
cd backend
npm install
npx prisma generate
npx prisma db push --accept-data-loss
cd ..

echo "Khởi động lại Server (PM2)..."
cd backend
npx pm2 restart autobells-api || npx pm2 start npm --name "autobells-api" -- run start
cd ..

echo "✅ Cập nhật thành công!"
