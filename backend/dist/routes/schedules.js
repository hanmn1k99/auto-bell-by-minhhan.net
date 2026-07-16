"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// GET /api/schedules
router.get('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const schedules = await prisma_1.prisma.schedule.findMany({
            include: { playlist: true },
            orderBy: { startTime: 'asc' },
        });
        res.json(schedules);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to get schedules' });
    }
});
// POST /api/schedules
router.post('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const { name, startTime, endTime, playlistId, daysOfWeek, isActive } = req.body;
        if (!name || !startTime || !endTime || !playlistId || !daysOfWeek) {
            return res.status(400).json({ error: 'All fields required' });
        }
        const schedule = await prisma_1.prisma.schedule.create({
            data: { name, startTime, endTime, playlistId: Number(playlistId), daysOfWeek, isActive: isActive ?? true },
            include: { playlist: true },
        });
        res.status(201).json(schedule);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to create schedule' });
    }
});
// PUT /api/schedules/:id
router.put('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const { name, startTime, endTime, playlistId, daysOfWeek, isActive } = req.body;
        const schedule = await prisma_1.prisma.schedule.update({
            where: { id: Number(req.params.id) },
            data: { name, startTime, endTime, playlistId: Number(playlistId), daysOfWeek, isActive },
            include: { playlist: true },
        });
        res.json(schedule);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to update schedule' });
    }
});
// DELETE /api/schedules/:id
router.delete('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        await prisma_1.prisma.schedule.delete({ where: { id: Number(req.params.id) } });
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to delete schedule' });
    }
});
// GET /api/bells
router.get('/bells', auth_1.authenticateToken, async (req, res) => {
    try {
        const bells = await prisma_1.prisma.bellConfig.findMany({
            include: { audioFile: true },
            orderBy: { time: 'asc' },
        });
        res.json(bells);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to get bells' });
    }
});
// POST /api/bells
router.post('/bells', auth_1.authenticateToken, async (req, res) => {
    try {
        const { type, time, audioFileId, daysOfWeek, isActive } = req.body;
        if (!type || !time || !audioFileId || !daysOfWeek) {
            return res.status(400).json({ error: 'All fields required' });
        }
        const bell = await prisma_1.prisma.bellConfig.create({
            data: { type, time, audioFileId: Number(audioFileId), daysOfWeek, isActive: isActive ?? true },
            include: { audioFile: true },
        });
        res.status(201).json(bell);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to create bell' });
    }
});
// PUT /api/bells/:id
router.put('/bells/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const { type, time, audioFileId, daysOfWeek, isActive } = req.body;
        const bell = await prisma_1.prisma.bellConfig.update({
            where: { id: Number(req.params.id) },
            data: { type, time, audioFileId: Number(audioFileId), daysOfWeek, isActive },
            include: { audioFile: true },
        });
        res.json(bell);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to update bell' });
    }
});
// DELETE /api/bells/:id
router.delete('/bells/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        await prisma_1.prisma.bellConfig.delete({ where: { id: Number(req.params.id) } });
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to delete bell' });
    }
});
exports.default = router;
