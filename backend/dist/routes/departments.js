"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// GET /api/departments
router.get('/', async (req, res) => {
    try {
        const deps = await prisma_1.prisma.department.findMany({
            orderBy: { id: 'asc' }
        });
        res.json(deps);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch departments' });
    }
});
// POST /api/departments (Admin only)
router.post('/', auth_1.authenticateToken, async (req, res) => {
    if (req.user.role !== 'ADMIN')
        return res.status(403).json({ error: 'Admin only' });
    const { name, description, color, soundCardId } = req.body;
    if (!name)
        return res.status(400).json({ error: 'Name is required' });
    try {
        const dep = await prisma_1.prisma.department.create({
            data: { name, description, color, soundCardId: soundCardId || 'default' }
        });
        res.json(dep);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to create department' });
    }
});
// PUT /api/departments/:id (Admin only)
router.put('/:id', auth_1.authenticateToken, async (req, res) => {
    if (req.user.role !== 'ADMIN')
        return res.status(403).json({ error: 'Admin only' });
    const { name, description, color, soundCardId } = req.body;
    try {
        const dep = await prisma_1.prisma.department.update({
            where: { id: Number(req.params.id) },
            data: { name, description, color, soundCardId: soundCardId || 'default' }
        });
        res.json(dep);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to update department' });
    }
});
// DELETE /api/departments/:id (Admin only)
router.delete('/:id', auth_1.authenticateToken, async (req, res) => {
    if (req.user.role !== 'ADMIN')
        return res.status(403).json({ error: 'Admin only' });
    try {
        await prisma_1.prisma.department.delete({
            where: { id: Number(req.params.id) }
        });
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to delete department. Make sure no bells are attached.' });
    }
});
exports.default = router;
