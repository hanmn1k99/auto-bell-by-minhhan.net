"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('CẢNH BÁO: BẠN ĐANG RESET TOÀN BỘ HỆ THỐNG');
    console.log('Quá trình này sẽ xóa toàn bộ Tài khoản, Tệp âm thanh, Lịch phát và Chuông báo!');
    // Wait for 5 seconds to let user cancel if needed
    console.log('Bắt đầu xóa sau 5 giây... Nhấn Ctrl+C để hủy.');
    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log('Đang thực hiện xóa CSDL...');
    try {
        await prisma.schedule.deleteMany({});
        await prisma.bellConfig.deleteMany({});
        await prisma.playlistItem.deleteMany({});
        await prisma.playlist.deleteMany({});
        await prisma.audioFile.deleteMany({});
        await prisma.user.deleteMany({});
        await prisma.device.deleteMany({});
        await prisma.deviceFingerprint.deleteMany({});
        // Delete physical files
        const uploadsDir = path_1.default.join(__dirname, '..', 'uploads');
        if (fs_1.default.existsSync(uploadsDir)) {
            const files = fs_1.default.readdirSync(uploadsDir);
            for (const file of files) {
                if (file !== 'assets') { // Giữ lại thư mục assets
                    const filePath = path_1.default.join(uploadsDir, file);
                    const stat = fs_1.default.statSync(filePath);
                    if (stat.isFile()) {
                        fs_1.default.unlinkSync(filePath);
                    }
                }
            }
        }
        console.log('Hoàn tất reset hệ thống! Hãy khởi động lại ứng dụng và truy cập web để tạo Admin mới.');
    }
    catch (error) {
        console.error('Lỗi khi reset:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
main();
