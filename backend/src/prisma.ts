import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

export const prisma = new PrismaClient();

export async function initDB() {
  try {
    await prisma.$queryRawUnsafe('PRAGMA journal_mode=WAL;');
    await prisma.$queryRawUnsafe('PRAGMA synchronous=NORMAL;');
    console.log('[DB] WAL mode enabled');
  } catch(err) {
    console.error('[DB] Failed to enable WAL mode:', err);
  }
}

