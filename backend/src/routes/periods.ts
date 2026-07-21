import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// GET /api/periods
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const periods = await prisma.period.findMany({
      include: { audioFile: true, department: true },
      orderBy: [{ departmentId: 'asc' }, { startTime: 'asc' }],
    });
    res.json(periods);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get periods' });
  }
});

// POST /api/periods
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { name, departmentId, startTime, endTime, audioFileId, volume, isActive, daysOfWeek } = req.body;
    if (!departmentId || !startTime || !endTime || !audioFileId || !daysOfWeek) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const period = await prisma.period.create({
      data: {
        name: name || '',
        departmentId: Number(departmentId),
        startTime,
        endTime,
        audioFileId: Number(audioFileId),
        volume: volume ?? 1.0,
        isActive: isActive ?? true,
        daysOfWeek,
      },
      include: { audioFile: true, department: true },
    });
    res.status(201).json(period);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create period' });
  }
});

// POST /api/periods/bulk — Tạo nhiều tiết cùng lúc
router.post('/bulk', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { periods } = req.body;
    if (!periods || !Array.isArray(periods) || periods.length === 0) {
      return res.status(400).json({ error: 'periods array is required' });
    }
    const created = [];
    for (const p of periods) {
      const period = await prisma.period.create({
        data: {
          name: p.name || '',
          departmentId: Number(p.departmentId),
          startTime: p.startTime,
          endTime: p.endTime,
          audioFileId: Number(p.audioFileId),
          volume: p.volume ?? 1.0,
          isActive: p.isActive ?? true,
          daysOfWeek: p.daysOfWeek,
        },
        include: { audioFile: true, department: true },
      });
      created.push(period);
    }
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: 'Failed to bulk create periods' });
  }
});

// PUT /api/periods/:id
router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { name, departmentId, startTime, endTime, audioFileId, volume, isActive, daysOfWeek } = req.body;
    const period = await prisma.period.update({
      where: { id: Number(req.params.id) },
      data: {
        name,
        departmentId: Number(departmentId),
        startTime,
        endTime,
        audioFileId: Number(audioFileId),
        volume: volume ?? 1.0,
        isActive,
        daysOfWeek,
      },
      include: { audioFile: true, department: true },
    });
    res.json(period);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update period' });
  }
});

// DELETE /api/periods/:id
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    await prisma.period.delete({ where: { id: Number(req.params.id) } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete period' });
  }
});

// POST /api/periods/bulk-delete
router.post('/bulk-delete', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }
    await prisma.period.deleteMany({ where: { id: { in: ids.map(Number) } } });
    res.json({ success: true, deletedCount: ids.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to bulk delete periods' });
  }
});

export default router;
