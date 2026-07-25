"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../prisma");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { username, password, remember } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }
        const user = await prisma_1.prisma.user.findUnique({ where: { username } });
        if (!user)
            return res.status(401).json({ error: 'Invalid credentials' });
        const valid = await bcryptjs_1.default.compare(password, user.password);
        if (!valid)
            return res.status(401).json({ error: 'Invalid credentials' });
        const expiresIn = remember ? '3d' : '24h';
        const token = jsonwebtoken_1.default.sign({ id: user.id, username: user.username, role: user.role }, auth_1.JWT_SECRET, { expiresIn });
        res.json({ token, username: user.username, role: user.role });
    }
    catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
// POST /api/auth/change-password
router.post('/change-password', async (req, res) => {
    try {
        const { username, oldPassword, newPassword } = req.body;
        const user = await prisma_1.prisma.user.findUnique({ where: { username } });
        if (!user)
            return res.status(404).json({ error: 'User not found' });
        const valid = await bcryptjs_1.default.compare(oldPassword, user.password);
        if (!valid)
            return res.status(401).json({ error: 'Old password is incorrect' });
        const hashed = await bcryptjs_1.default.hash(newPassword, 10);
        await prisma_1.prisma.user.update({ where: { username }, data: { password: hashed } });
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
    try {
        const { username, recoveryKey, newPassword } = req.body;
        if (!username || !recoveryKey || !newPassword) {
            return res.status(400).json({ error: 'Missing fields' });
        }
        const user = await prisma_1.prisma.user.findUnique({ where: { username } });
        if (!user || !user.recoveryKeyHash) {
            return res.status(404).json({ error: 'User not found or recovery not enabled' });
        }
        const valid = await bcryptjs_1.default.compare(recoveryKey, user.recoveryKeyHash);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid recovery key' });
        }
        const hashed = await bcryptjs_1.default.hash(newPassword, 10);
        await prisma_1.prisma.user.update({ where: { username }, data: { password: hashed } });
        res.json({ success: true, message: 'Password reset successfully' });
    }
    catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
