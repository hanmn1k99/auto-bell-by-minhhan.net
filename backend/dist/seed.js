"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = require("./prisma");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
async function seed() {
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const hashedPassword = await bcryptjs_1.default.hash(adminPassword, 10);
    await prisma_1.prisma.user.upsert({
        where: { username: adminUsername },
        update: { password: hashedPassword },
        create: {
            username: adminUsername,
            password: hashedPassword,
        },
    });
    console.log(`Admin user '${adminUsername}' configured with credentials from .env`);
    await prisma_1.prisma.$disconnect();
}
seed().catch((e) => { console.error(e); process.exit(1); });
