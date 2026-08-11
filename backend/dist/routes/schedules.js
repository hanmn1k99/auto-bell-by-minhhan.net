"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../prisma");
const scheduler_1 = require("../scheduler");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// GET /api/schedules
router.get('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const schedules = await prisma_1.prisma.schedule.findMany({
            include: {
                playlist: {
                    include: { items: { include: { audioFile: true }, orderBy: { order: 'asc' } } },
                },
            },
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
        const { name, startTime, endTime, daysOfWeek: rawDaysOfWeek, isActive } = req.body;
        const daysOfWeek = Array.isArray(rawDaysOfWeek) ? rawDaysOfWeek.join(",") : (rawDaysOfWeek ? String(rawDaysOfWeek) : undefined);
        if (!name || !startTime || !endTime || !daysOfWeek) {
            return res.status(400).json({ error: 'All fields required' });
        }
        const playlist = await prisma_1.prisma.playlist.create({
            data: {
                name: name,
                volume: 1.0
            }
        });
        const schedule = await prisma_1.prisma.schedule.create({
            data: { name, startTime, endTime, playlistId: playlist.id, daysOfWeek, isActive: isActive ?? true },
            include: { playlist: true },
        });
        await (0, scheduler_1.reloadScheduleCache)();
        res.status(201).json(schedule);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to create schedule' });
    }
});
// PUT /api/schedules/:id
router.put('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const { name, startTime, endTime, playlistId, daysOfWeek: rawDaysOfWeek, isActive } = req.body;
        const daysOfWeek = Array.isArray(rawDaysOfWeek) ? rawDaysOfWeek.join(",") : (rawDaysOfWeek ? String(rawDaysOfWeek) : undefined);
        const schedule = await prisma_1.prisma.schedule.update({
            where: { id: Number(req.params.id) },
            data: { name, startTime, endTime, playlistId: Number(playlistId), daysOfWeek, isActive },
            include: { playlist: true },
        });
        // Also rename the associated playlist if schedule name changed
        if (name && schedule.playlistId) {
            await prisma_1.prisma.playlist.update({
                where: { id: schedule.playlistId },
                data: { name: name }
            });
        }
        await (0, scheduler_1.reloadScheduleCache)();
        res.json(schedule);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to update schedule' });
    }
});
// DELETE /api/schedules/:id
router.delete('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const sch = await prisma_1.prisma.schedule.findUnique({ where: { id: Number(req.params.id) } });
        if (sch) {
            // Deleting the playlist will cascade and delete the schedule and playlist items
            await prisma_1.prisma.playlist.delete({ where: { id: sch.playlistId } });
        }
        await (0, scheduler_1.reloadScheduleCache)();
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to delete schedule' });
    }
});
exports.default = router;
