"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enableWAL = enableWAL;
const client_1 = require("@prisma/client");
async function enableWAL() {
    const prisma = new client_1.PrismaClient();
    try {
        // PRAGMA statements return rows, so we must use $queryRawUnsafe instead of $executeRawUnsafe
        await prisma.$queryRawUnsafe('PRAGMA journal_mode = WAL;');
        await prisma.$queryRawUnsafe('PRAGMA synchronous = NORMAL;');
        console.log('[DB] WAL mode enforced via Prisma');
    }
    catch (err) {
        console.error('[DB] Failed to set WAL:');
        console.error(err);
    }
    finally {
        await prisma.$disconnect();
    }
}
