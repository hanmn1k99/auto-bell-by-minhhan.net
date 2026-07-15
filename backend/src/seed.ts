import { prisma } from './prisma';
import bcrypt from 'bcryptjs';

async function seed() {
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  await prisma.user.upsert({
    where: { username: adminUsername },
    update: { password: hashedPassword },
    create: {
      username: adminUsername,
      password: hashedPassword,
    },
  });
  console.log(`Admin user '${adminUsername}' configured with credentials from .env`);
  await prisma.$disconnect();
}

seed().catch((e) => { console.error(e); process.exit(1); });
