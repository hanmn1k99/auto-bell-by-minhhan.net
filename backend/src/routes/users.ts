import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import bcrypt from 'bcryptjs';

const router = Router();

// Lấy danh sách users (trừ password và recoveryKeyHash)
router.get('/', async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true
      }
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin tạo user mới
router.post('/', async (req: Request, res: Response) => {
  try {
    const { username, password, role } = req.body;
    if (!username || !password || !role) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        username,
        password: passwordHash,
        role
      },
      select: { id: true, username: true, role: true }
    });
    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin cập nhật user (đổi role hoặc reset password)
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const { role, newPassword } = req.body;
    
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const updateData: any = {};
    if (role) updateData.role = role;
    if (newPassword) {
      updateData.password = await bcrypt.hash(newPassword, 10);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, username: true, role: true }
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin xóa user
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    // Không cho phép xóa chính mình
    if ((req as any).user && (req as any).user.id === id) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }

    await prisma.user.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
