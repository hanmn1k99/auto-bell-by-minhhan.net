import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

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
  } catch (e) {
    console.error('ERROR:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}
run();
