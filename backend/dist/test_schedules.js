"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function run() {
    try {
        const s = await prisma.schedule.findMany({
            include: {
                playlist: {
                    include: {
                        items: {
                            include: { audioFile: true }
                        }
                    }
                }
            }
        });
        console.log('OK, schedules count:', s.length);
    }
    catch (e) {
        console.error('ERROR:', e.message);
    }
    finally {
        await prisma.$disconnect();
    }
}
run();
