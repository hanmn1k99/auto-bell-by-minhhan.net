"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../prisma");
const scheduler_1 = require("../scheduler");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
function normalizeTime(timeStr) {
    if (!timeStr)
        return '';
    timeStr = timeStr.trim();
    if (timeStr.includes(':')) {
        const parts = timeStr.split(':');
        if (parts.length === 2) {
            return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:00`;
        }
        else if (parts.length === 3) {
            return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:${parts[2].padStart(2, '0')}`;
        }
        return timeStr;
    }
    // No colon - fast typing
    if (timeStr.length === 3 || timeStr.length === 4) {
        const mm = timeStr.slice(-2);
        const hh = timeStr.slice(0, -2);
        return `${hh.padStart(2, '0')}:${mm.padStart(2, '0')}:00`;
    }
    if (timeStr.length === 5 || timeStr.length === 6) {
        const ss = timeStr.slice(-2);
        const mm = timeStr.slice(-4, -2);
        const hh = timeStr.slice(0, -4);
        return `${hh.padStart(2, '0')}:${mm.padStart(2, '0')}:${ss.padStart(2, '0')}`;
    }
    if (timeStr.length === 1 || timeStr.length === 2) {
        return `${timeStr.padStart(2, '0')}:00:00`;
    }
    return timeStr;
}
// GET /api/periods
router.get('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const periods = await prisma_1.prisma.period.findMany({
            include: { audioFile: true, department: true },
            orderBy: [{ departmentId: 'asc' }, { startTime: 'asc' }],
        });
        res.json(periods);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to get periods' });
    }
});
// POST /api/periods
router.post('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const { name, departmentId, startTime, endTime, audioFileId, volume, isActive, daysOfWeek: rawDaysOfWeek } = req.body;
        const daysOfWeek = Array.isArray(rawDaysOfWeek) ? rawDaysOfWeek.join(",") : (rawDaysOfWeek ? String(rawDaysOfWeek) : undefined);
        if (!departmentId || !startTime || !endTime || !audioFileId || !daysOfWeek) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const period = await prisma_1.prisma.period.create({
            data: {
                name: name || '',
                departmentId: Number(departmentId),
                startTime: normalizeTime(startTime),
                endTime: normalizeTime(endTime),
                audioFileId: Number(audioFileId),
                volume: volume ?? 1.0,
                isActive: isActive ?? true,
                daysOfWeek,
            },
            include: { audioFile: true, department: true },
        });
        res.status(201).json(period);
        (0, scheduler_1.reloadScheduleCache)().catch(() => { });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to create period' });
    }
});
// POST /api/periods/bulk
router.post('/bulk', auth_1.authenticateToken, async (req, res) => {
    try {
        const { periods } = req.body;
        if (!periods || !Array.isArray(periods) || periods.length === 0) {
            return res.status(400).json({ error: 'periods array is required' });
        }
        const createPromises = periods.map((p) => prisma_1.prisma.period.create({
            data: {
                name: p.name || '',
                departmentId: Number(p.departmentId),
                startTime: normalizeTime(p.startTime),
                endTime: normalizeTime(p.endTime),
                audioFileId: Number(p.audioFileId),
                volume: p.volume ?? 1.0,
                isActive: p.isActive ?? true,
                daysOfWeek: Array.isArray(p.daysOfWeek) ? p.daysOfWeek.join(",") : String(p.daysOfWeek),
            },
            include: { audioFile: true, department: true }
        }));
        const created = await prisma_1.prisma.$transaction(createPromises);
        res.status(201).json(created);
        (0, scheduler_1.reloadScheduleCache)().catch(() => { });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to bulk create periods' });
    }
});
// POST /api/periods/bulk-update
router.post('/bulk-update', auth_1.authenticateToken, async (req, res) => {
    try {
        const { ids, audioFileId, departmentId, daysOfWeek: rawDaysOfWeek, isActive, volume } = req.body;
        const daysOfWeek = Array.isArray(rawDaysOfWeek) ? rawDaysOfWeek.join(",") : (rawDaysOfWeek ? String(rawDaysOfWeek) : undefined);
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'Vui lòng chọn ít nhất 1 tiết học để sửa' });
        }
        const dataToUpdate = {};
        if (audioFileId !== undefined && audioFileId !== null && audioFileId !== '') {
            dataToUpdate.audioFileId = Number(audioFileId);
        }
        if (departmentId !== undefined && departmentId !== null && departmentId !== '') {
            dataToUpdate.departmentId = Number(departmentId);
        }
        if (daysOfWeek !== undefined && daysOfWeek !== null && daysOfWeek !== '') {
            dataToUpdate.daysOfWeek = String(daysOfWeek);
        }
        if (typeof isActive === 'boolean') {
            dataToUpdate.isActive = isActive;
        }
        if (typeof volume === 'number') {
            dataToUpdate.volume = volume;
        }
        if (Object.keys(dataToUpdate).length === 0) {
            return res.status(400).json({ error: 'Chưa chọn thông tin nào cần cập nhật' });
        }
        await prisma_1.prisma.period.updateMany({
            where: { id: { in: ids.map(Number) } },
            data: dataToUpdate,
        });
        res.json({ success: true, updatedCount: ids.length });
        (0, scheduler_1.reloadScheduleCache)().catch(() => { });
    }
    catch (err) {
        console.error('Bulk update periods error:', err);
        res.status(500).json({ error: 'Lỗi sửa hàng loạt tiết học' });
    }
});
// PUT /api/periods/:id
router.put('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const { name, departmentId, startTime, endTime, audioFileId, volume, isActive, daysOfWeek: rawDaysOfWeek } = req.body;
        const daysOfWeek = Array.isArray(rawDaysOfWeek) ? rawDaysOfWeek.join(",") : (rawDaysOfWeek ? String(rawDaysOfWeek) : undefined);
        const period = await prisma_1.prisma.period.update({
            where: { id: Number(req.params.id) },
            data: {
                name,
                departmentId: Number(departmentId),
                startTime: normalizeTime(startTime),
                endTime: normalizeTime(endTime),
                audioFileId: Number(audioFileId),
                volume: volume ?? 1.0,
                isActive,
                daysOfWeek,
            },
            include: { audioFile: true, department: true },
        });
        res.json(period);
        (0, scheduler_1.reloadScheduleCache)().catch(() => { });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to update period' });
    }
});
// DELETE /api/periods/:id
router.delete('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        await prisma_1.prisma.period.delete({ where: { id: Number(req.params.id) } });
        res.json({ success: true });
        (0, scheduler_1.reloadScheduleCache)().catch(() => { });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to delete period' });
    }
});
// POST /api/periods/bulk-delete
router.post('/bulk-delete', auth_1.authenticateToken, async (req, res) => {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'ids array is required' });
        }
        await prisma_1.prisma.period.deleteMany({ where: { id: { in: ids.map(Number) } } });
        res.json({ success: true, deletedCount: ids.length });
        (0, scheduler_1.reloadScheduleCache)().catch(() => { });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to bulk delete periods' });
    }
});
exports.default = router;
