import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// GET /api/schedules
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const schedules = await prisma.schedule.findMany({
      include: { playlist: true },
      orderBy: { startTime: 'asc' },
    });
    res.json(schedules);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get schedules' });
  }
});

// POST /api/schedules
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { name, startTime, endTime, playlistId, daysOfWeek, isActive } = req.body;
    if (!name || !startTime || !endTime || !playlistId || !daysOfWeek) {
      return res.status(400).json({ error: 'All fields required' });
    }
    const schedule = await prisma.schedule.create({
      data: { name, startTime, endTime, playlistId: Number(playlistId), daysOfWeek, isActive: isActive ?? true },
      include: { playlist: true },
    });
    res.status(201).json(schedule);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create schedule' });
  }
});

// PUT /api/schedules/:id
router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { name, startTime, endTime, playlistId, daysOfWeek, isActive } = req.body;
    const schedule = await prisma.schedule.update({
      where: { id: Number(req.params.id) },
      data: { name, startTime, endTime, playlistId: Number(playlistId), daysOfWeek, isActive },
      include: { playlist: true },
    });
    res.json(schedule);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update schedule' });
  }
});

// DELETE /api/schedules/:id
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    await prisma.schedule.delete({ where: { id: Number(req.params.id) } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete schedule' });
  }
});

export default router;
