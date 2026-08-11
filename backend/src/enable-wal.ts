import { PrismaClient } from '@prisma/client';

export async function enableWAL() {
  const prisma = new PrismaClient();
  try {
    // PRAGMA statements return rows, so we must use $queryRawUnsafe instead of $executeRawUnsafe
    await prisma.$queryRawUnsafe('PRAGMA journal_mode = WAL;');
    await prisma.$queryRawUnsafe('PRAGMA synchronous = NORMAL;');
    console.log('[DB] WAL mode enforced via Prisma');
  } catch (err: any) {
    console.error('[DB] Failed to set WAL:');
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}
