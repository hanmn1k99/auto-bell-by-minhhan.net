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
            orderBy: [
                { order: 'asc' },
                { id: 'asc' }
            ],
        });
        res.json(schedules);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch schedules' });
    }
});
// POST /api/schedules/reorder
router.post('/reorder', auth_1.authenticateToken, async (req, res) => {
    try {
        const { orderIds } = req.body;
        if (!Array.isArray(orderIds))
            return res.status(400).json({ error: 'Invalid data' });
        // Process reorder in a transaction
        await prisma_1.prisma.$transaction(orderIds.map((id, index) => prisma_1.prisma.schedule.update({
            where: { id },
            data: { order: index }
        })));
        res.json({ success: true });
        (0, scheduler_1.reloadScheduleCache)().catch(() => { });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to reorder' });
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
        res.status(201).json(schedule);
        (0, scheduler_1.reloadScheduleCache)().catch(() => { });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to create schedule' });
    }
});
// POST /api/schedules/:id/duplicate
router.post('/:id/duplicate', auth_1.authenticateToken, async (req, res) => {
    try {
        const id = Number(req.params.id);
        const originalSch = await prisma_1.prisma.schedule.findUnique({
            where: { id },
            include: {
                playlist: {
                    include: {
                        items: true
                    }
                }
            }
        });
        if (!originalSch)
            return res.status(404).json({ error: 'Not found' });
        // Dupe playlist
        const newPlaylist = await prisma_1.prisma.playlist.create({
            data: {
                name: `${originalSch.playlist.name} (Copy)`,
                volume: originalSch.playlist.volume,
                isLoop: originalSch.playlist.isLoop,
                order: originalSch.playlist.order
            }
        });
        // Dupe playlist items
        if (originalSch.playlist.items.length > 0) {
            await prisma_1.prisma.playlistItem.createMany({
                data: originalSch.playlist.items.map(item => ({
                    playlistId: newPlaylist.id,
                    audioFileId: item.audioFileId,
                    order: item.order
                }))
            });
        }
        // Dupe schedule
        const newSch = await prisma_1.prisma.schedule.create({
            data: {
                name: `${originalSch.name} (Copy)`,
                startTime: originalSch.startTime,
                endTime: originalSch.endTime,
                daysOfWeek: originalSch.daysOfWeek,
                isActive: false, // Turn off by default to avoid overlapping
                playlistId: newPlaylist.id
            },
            include: { playlist: { include: { items: { include: { audioFile: true } } } } }
        });
        res.status(201).json(newSch);
        (0, scheduler_1.reloadScheduleCache)().catch(() => { });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to duplicate' });
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
        res.json(schedule);
        (0, scheduler_1.reloadScheduleCache)().catch(() => { });
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
        res.json({ success: true });
        (0, scheduler_1.reloadScheduleCache)().catch(() => { });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to delete schedule' });
    }
});
exports.default = router;
