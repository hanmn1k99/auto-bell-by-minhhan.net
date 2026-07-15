import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seed() {
  const existing = await prisma.user.findUnique({ where: { username: 'admin' } });
  if (!existing) {
    const hashed = await bcrypt.hash('admin123', 10);
    await prisma.user.create({ data: { username: 'admin', password: hashed } });
    console.log('Default admin created: admin / admin123');
  } else {
    console.log('Admin user already exists.');
  }
  await prisma.$disconnect();
}

seed().catch((e) => { console.error(e); process.exit(1); });
