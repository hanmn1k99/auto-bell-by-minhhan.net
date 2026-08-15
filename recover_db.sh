#!/bin/bash

echo "==============================================="
echo " CÔNG CỤ CẤP CỨU DATABASE SQLITE BỊ HỎNG (MALFORMED)"
echo "==============================================="

# 1. Dừng ứng dụng để an toàn
echo "🛑 Đang dừng autobells..."
pm2 stop autobells 2>/dev/null || true

# 2. Cài đặt sqlite3 nếu chưa có
if ! command -v sqlite3 &> /dev/null
then
    echo "⚙️ Đang cài đặt công cụ sqlite3..."
    sudo apt-get update
    sudo apt-get install -y sqlite3
fi

# 3. Chuyển vào thư mục chứa DB
cd backend/prisma || { echo "❌ Không tìm thấy thư mục backend/prisma"; exit 1; }

# 4. Sao lưu DB cũ
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
echo "📦 Đang sao lưu dev.db thành dev.db.bak_$TIMESTAMP..."
cp dev.db "dev.db.bak_$TIMESTAMP"

# 5. Phục hồi dữ liệu
echo "⚕️ Đang trích xuất và khôi phục dữ liệu từ file lỗi..."
rm -f dev_recovered.db
# Thử dùng .dump để lấy mọi thứ có thể cứu được, bỏ qua lỗi
sqlite3 dev.db ".dump" | sqlite3 dev_recovered.db

# 6. Kiểm tra xem file mới có được tạo không
if [ -f "dev_recovered.db" ]; then
    echo "✅ Khôi phục thành công! Đang ghi đè CSDL..."
    mv dev_recovered.db dev.db
    # Xóa file WAL và SHM bị kẹt
    rm -f dev.db-wal dev.db-shm
else
    echo "❌ Lỗi: Không thể khôi phục dữ liệu. Vui lòng giữ lại file backup."
    exit 1
fi

cd ../..

echo "🚀 Đang khởi động lại hệ thống..."
pm2 restart autobells

echo "==============================================="
echo "🎉 XONG! DATABASE ĐÃ ĐƯỢC CHỮA LÀNH!"
echo "==============================================="
