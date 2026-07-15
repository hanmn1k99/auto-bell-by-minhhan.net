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
cd ..

echo "Khởi động lại Server (PM2)..."
pm2 restart autobells

echo "✅ Cập nhật thành công!"
