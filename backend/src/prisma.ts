import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

export const prisma = new PrismaClient();

// Enable Write-Ahead Logging (WAL) for SQLite to allow concurrent reads and writes
prisma.$queryRawUnsafe('PRAGMA journal_mode=WAL;').catch(console.error);
prisma.$queryRawUnsafe('PRAGMA synchronous=NORMAL;').catch(console.error);
