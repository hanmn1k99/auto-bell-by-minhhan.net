"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../prisma");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const router = (0, express_1.Router)();
// Lấy danh sách users (trừ password và recoveryKeyHash)
router.get('/', async (req, res) => {
    try {
        const users = await prisma_1.prisma.user.findMany({
            select: {
                id: true,
                username: true,
                role: true,
                createdAt: true
            }
        });
        res.json(users);
    }
    catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Admin tạo user mới
router.post('/', async (req, res) => {
    try {
        const { username, password, role } = req.body;
        if (!username || !password || !role) {
            return res.status(400).json({ error: 'Missing fields' });
        }
        const existing = await prisma_1.prisma.user.findUnique({ where: { username } });
        if (existing) {
            return res.status(400).json({ error: 'Username already exists' });
        }
        const passwordHash = await bcryptjs_1.default.hash(password, 10);
        const user = await prisma_1.prisma.user.create({
            data: {
                username,
                password: passwordHash,
                role
            },
            select: { id: true, username: true, role: true }
        });
        res.status(201).json(user);
    }
    catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Admin cập nhật user (đổi role hoặc reset password)
router.put('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { role, newPassword } = req.body;
        // Ngăn Admin tự hạ quyền của chính mình
        if (role && role !== 'ADMIN' && req.user && req.user.id === id) {
            return res.status(400).json({ error: 'Cannot downgrade your own role' });
        }
        const user = await prisma_1.prisma.user.findUnique({ where: { id } });
        if (!user)
            return res.status(404).json({ error: 'User not found' });
        const updateData = {};
        if (role)
            updateData.role = role;
        if (newPassword) {
            updateData.password = await bcryptjs_1.default.hash(newPassword, 10);
        }
        const updated = await prisma_1.prisma.user.update({
            where: { id },
            data: updateData,
            select: { id: true, username: true, role: true }
        });
        res.json(updated);
    }
    catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Admin xóa user
router.delete('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        // Không cho phép xóa chính mình
        if (req.user && req.user.id === id) {
            return res.status(400).json({ error: 'Cannot delete yourself' });
        }
        await prisma_1.prisma.user.delete({ where: { id } });
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
