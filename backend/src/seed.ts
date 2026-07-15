import { prisma } from './prisma';
import bcrypt from 'bcryptjs';

async function seed() {
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

  const existing = await prisma.user.findUnique({ where: { username: adminUsername } });
  if (!existing) {
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    await prisma.user.create({
      data: {
        username: adminUsername,
        password: hashedPassword,
      },
    });
    console.log(`Admin user '${adminUsername}' created.`);
  } else {
    console.log('Admin user already exists.');
  }
  await prisma.$disconnect();
}

seed().catch((e) => { console.error(e); process.exit(1); });
