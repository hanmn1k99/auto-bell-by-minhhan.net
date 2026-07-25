"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../prisma");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const router = (0, express_1.Router)();
// GET /api/setup/status
// Kiểm tra xem hệ thống đã được cài đặt chưa (đã có user nào chưa)
router.get('/status', async (req, res) => {
    try {
        const userCount = await prisma_1.prisma.user.count();
        res.json({ isSetup: userCount > 0 });
    }
    catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
// POST /api/setup/init
// Khởi tạo tài khoản Admin đầu tiên
router.post('/init', async (req, res) => {
    try {
        const userCount = await prisma_1.prisma.user.count();
        if (userCount > 0) {
            return res.status(403).json({ error: 'System is already setup.' });
        }
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }
        // Sinh ra Recovery Key ngẫu nhiên
        const rawRecoveryKey = 'AAS-' + crypto_1.default.randomBytes(4).toString('hex').toUpperCase() + '-' + crypto_1.default.randomBytes(4).toString('hex').toUpperCase();
        const passwordHash = await bcryptjs_1.default.hash(password, 10);
        const recoveryKeyHash = await bcryptjs_1.default.hash(rawRecoveryKey, 10);
        const adminUser = await prisma_1.prisma.user.create({
            data: {
                username,
                password: passwordHash,
                role: 'ADMIN',
                recoveryKeyHash: recoveryKeyHash
            }
        });
        res.status(201).json({
            success: true,
            message: 'Admin user created successfully',
            recoveryKey: rawRecoveryKey // Trả về dạng raw một lần duy nhất
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
