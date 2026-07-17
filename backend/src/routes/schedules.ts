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

// GET /api/bells
router.get('/bells', authenticateToken, async (req: Request, res: Response) => {
  try {
    const bells = await prisma.bellConfig.findMany({
      include: { audioFile: true },
      orderBy: { time: 'asc' },
    });
    res.json(bells);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get bells' });
  }
});

// POST /api/bells
router.post('/bells', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { type, time, audioFileId, daysOfWeek, isActive, volume } = req.body;
    if (!type || !time || !audioFileId || !daysOfWeek) {
      return res.status(400).json({ error: 'All fields required' });
    }
    const bell = await prisma.bellConfig.create({
      data: { type, time, audioFileId: Number(audioFileId), daysOfWeek, isActive: isActive ?? true, volume: volume ?? 1.0 },
      include: { audioFile: true },
    });
    res.status(201).json(bell);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create bell' });
  }
});

// PUT /api/bells/:id
router.put('/bells/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { type, time, audioFileId, daysOfWeek, isActive, volume } = req.body;
    const bell = await prisma.bellConfig.update({
      where: { id: Number(req.params.id) },
      data: { type, time, audioFileId: Number(audioFileId), daysOfWeek, isActive, volume: volume ?? 1.0 },
      include: { audioFile: true },
    });
    res.json(bell);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update bell' });
  }
});

// DELETE /api/bells/:id
router.delete('/bells/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    await prisma.bellConfig.delete({ where: { id: Number(req.params.id) } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete bell' });
  }
});

export default router;
