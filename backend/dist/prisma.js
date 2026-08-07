"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
exports.initDB = initDB;
const client_1 = require("@prisma/client");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.prisma = new client_1.PrismaClient();
async function initDB() {
    try {
        await exports.prisma.$queryRawUnsafe('PRAGMA journal_mode=WAL;');
        await exports.prisma.$queryRawUnsafe('PRAGMA synchronous=NORMAL;');
        console.log('[DB] WAL mode enabled');
    }
    catch (err) {
        console.error('[DB] Failed to enable WAL mode:', err);
    }
}
