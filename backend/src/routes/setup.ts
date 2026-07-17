import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const router = Router();

// GET /api/setup/status
// Kiểm tra xem hệ thống đã được cài đặt chưa (đã có user nào chưa)
router.get('/status', async (req: Request, res: Response) => {
  try {
    const userCount = await prisma.user.count();
    res.json({ isSetup: userCount > 0 });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/setup/init
// Khởi tạo tài khoản Admin đầu tiên
router.post('/init', async (req: Request, res: Response) => {
  try {
    const userCount = await prisma.user.count();
    if (userCount > 0) {
      return res.status(403).json({ error: 'System is already setup.' });
    }

    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Sinh ra Recovery Key ngẫu nhiên
    const rawRecoveryKey = 'AUTO-BELL-' + crypto.randomBytes(4).toString('hex').toUpperCase() + '-' + crypto.randomBytes(4).toString('hex').toUpperCase();
    
    const passwordHash = await bcrypt.hash(password, 10);
    const recoveryKeyHash = await bcrypt.hash(rawRecoveryKey, 10);

    const adminUser = await prisma.user.create({
      data: {
        username,
        password: passwordHash,
        role: 'ADMIN',
        recoveryKeyHash: recoveryKeyHash
      }
    });

    res.status(201).json({
      success: true,
      message: 'Admin user created successfully',
      recoveryKey: rawRecoveryKey // Trả về dạng raw một lần duy nhất
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
