import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import { reloadScheduleCache } from '../scheduler';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// GET /api/schedules
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const schedules = await prisma.schedule.findMany({
      include: {
        playlist: {
          include: { items: { include: { audioFile: true }, orderBy: { order: 'asc' } } },
        },
      },
      orderBy: { id: 'asc' },
    });
    res.json(schedules);
  } catch (err: any) {
    const fs = require('fs');
    fs.writeFileSync('schedule_err.txt', String(err.message || err));
    res.status(500).json({ error: String(err.message || err) });
  }
});

// POST /api/schedules
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { name, startTime, endTime, daysOfWeek: rawDaysOfWeek, isActive } = req.body;
    const daysOfWeek = Array.isArray(rawDaysOfWeek) ? rawDaysOfWeek.join(",") : (rawDaysOfWeek ? String(rawDaysOfWeek) : undefined);
    if (!name || !startTime || !endTime || !daysOfWeek) {
      return res.status(400).json({ error: 'All fields required' });
    }

    const playlist = await prisma.playlist.create({
      data: {
        name: name,
        volume: 1.0
      }
    });

    const schedule = await prisma.schedule.create({
      data: { name, startTime, endTime, playlistId: playlist.id, daysOfWeek, isActive: isActive ?? true },
      include: { playlist: true },
    });
    res.status(201).json(schedule);
    reloadScheduleCache().catch(() => {});
  } catch (err) {
    res.status(500).json({ error: 'Failed to create schedule' });
  }
});

// PUT /api/schedules/:id
router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { name, startTime, endTime, playlistId, daysOfWeek: rawDaysOfWeek, isActive } = req.body;
    const daysOfWeek = Array.isArray(rawDaysOfWeek) ? rawDaysOfWeek.join(",") : (rawDaysOfWeek ? String(rawDaysOfWeek) : undefined);
    const schedule = await prisma.schedule.update({
      where: { id: Number(req.params.id) },
      data: { name, startTime, endTime, playlistId: Number(playlistId), daysOfWeek, isActive },
      include: { playlist: true },
    });
    
    // Also rename the associated playlist if schedule name changed
    if (name && schedule.playlistId) {
      await prisma.playlist.update({
        where: { id: schedule.playlistId },
        data: { name: name }
      });
    }

    res.json(schedule);
    reloadScheduleCache().catch(() => {});
  } catch (err) {
    res.status(500).json({ error: 'Failed to update schedule' });
  }
});

// DELETE /api/schedules/:id
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const sch = await prisma.schedule.findUnique({ where: { id: Number(req.params.id) } });
    if (sch) {
      // Deleting the playlist will cascade and delete the schedule and playlist items
      await prisma.playlist.delete({ where: { id: sch.playlistId } });
    }
    res.json({ success: true });
    reloadScheduleCache().catch(() => {});
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete schedule' });
  }
});

export default router;
