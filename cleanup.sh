#!/bin/bash
echo "================================================="
echo "  AUTO-BELLS - DỌN DẸP & BẢO MẬT MÃ NGUỒN       "
echo "================================================="
echo "CẢNH BÁO: Script này sẽ XÓA VĨNH VIỄN toàn bộ mã nguồn (source code) chưa biên dịch,"
echo "bao gồm thư mục src của frontend/backend và công cụ git."
echo "Chỉ giữ lại bản build (.js, dist) để chạy server nhằm bảo mật."
echo "Không thể dùng lệnh 'git pull' hoặc 'update.sh' sau khi đã chạy script này."
echo ""
echo "Vui lòng đợi 5 giây để hủy bằng Ctrl+C..."
sleep 5

echo ""
echo "[1/4] Đang biên dịch Backend (TypeScript -> JavaScript)..."
cd backend
npx tsc

echo "[2/4] Xóa mã nguồn Backend..."
rm -rf src tsconfig.json

echo "[3/4] Xóa mã nguồn Frontend (chỉ giữ lại bản build dist/)..."
cd ../frontend
rm -rf src public node_modules .eslintrc.js tsconfig.json vite.config.ts index.html package.json package-lock.json README.md
cd ..

echo "[4/4] Xóa mã nguồn Git và các script không cần thiết..."
rm -rf .git
rm -f setup.sh setup.bat update.sh README.md

echo "Cập nhật cấu hình khởi động PM2 để dùng bản Build..."
# Restart bằng bản build
npx pm2 delete autobells 2>/dev/null
cd backend
npx pm2 start dist/index.js --name "autobells"
npx pm2 save

echo "================================================="
echo "✅ HOÀN TẤT! Dự án đã được tối giản mã nguồn."
echo "================================================="
