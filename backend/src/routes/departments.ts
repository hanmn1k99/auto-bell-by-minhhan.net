import express, { Request, Response } from 'express';
import { prisma } from '../prisma';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// GET /api/departments
router.get('/', async (req: Request, res: Response) => {
  try {
    const deps = await prisma.department.findMany({
      orderBy: { id: 'asc' }
    });
    res.json(deps);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

// POST /api/departments (Admin only)
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  if ((req as any).user.role !== 'ADMIN') return res.status(403).json({ error: 'Admin only' });
  const { name, description, color } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  try {
    const dep = await prisma.department.create({
      data: { name, description, color }
    });
    res.json(dep);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create department' });
  }
});

// PUT /api/departments/:id (Admin only)
router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  if ((req as any).user.role !== 'ADMIN') return res.status(403).json({ error: 'Admin only' });
  const { name, description, color } = req.body;

  try {
    const dep = await prisma.department.update({
      where: { id: Number(req.params.id) },
      data: { name, description, color }
    });
    res.json(dep);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update department' });
  }
});

// DELETE /api/departments/:id (Admin only)
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  if ((req as any).user.role !== 'ADMIN') return res.status(403).json({ error: 'Admin only' });
  try {
    await prisma.department.delete({
      where: { id: Number(req.params.id) }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete department. Make sure no bells are attached.' });
  }
});

export default router;
