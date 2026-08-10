import { PrismaClient } from '@prisma/client';

export async function enableWAL() {
  const prisma = new PrismaClient();
  try {
    await prisma.$executeRawUnsafe('PRAGMA journal_mode = WAL;');
    await prisma.$executeRawUnsafe('PRAGMA synchronous = NORMAL;');
    console.log('[DB] WAL mode enforced via Prisma');
  } catch (err: any) {
    console.error('[DB] Failed to set WAL:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}
