import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const MAX_INT = 2147483647;
  console.log(`Bắt đầu dọn dẹp các ID bị lỗi (lớn hơn ${MAX_INT}) bằng Prisma...`);

  try {
    const p1 = await prisma.$executeRawUnsafe(`DELETE FROM "Period" WHERE "audioFileId" > ${MAX_INT} OR "departmentId" > ${MAX_INT} OR "id" > ${MAX_INT}`);
    console.log(`Đã xóa ${p1} dòng lỗi trong bảng Period`);

    const p2 = await prisma.$executeRawUnsafe(`DELETE FROM "BellConfig" WHERE "audioFileId" > ${MAX_INT} OR "departmentId" > ${MAX_INT} OR "id" > ${MAX_INT}`);
    console.log(`Đã xóa ${p2} dòng lỗi trong bảng BellConfig`);

    const p3 = await prisma.$executeRawUnsafe(`DELETE FROM "PlaylistItem" WHERE "audioFileId" > ${MAX_INT} OR "playlistId" > ${MAX_INT} OR "id" > ${MAX_INT}`);
    console.log(`Đã xóa ${p3} dòng lỗi trong bảng PlaylistItem`);

    const p4 = await prisma.$executeRawUnsafe(`DELETE FROM "Schedule" WHERE "playlistId" > ${MAX_INT} OR "id" > ${MAX_INT}`);
    console.log(`Đã xóa ${p4} dòng lỗi trong bảng Schedule`);

    const p5 = await prisma.$executeRawUnsafe(`DELETE FROM "AudioFile" WHERE "id" > ${MAX_INT}`);
    console.log(`Đã xóa ${p5} dòng lỗi trong bảng AudioFile`);

    const p6 = await prisma.$executeRawUnsafe(`DELETE FROM "Playlist" WHERE "id" > ${MAX_INT}`);
    console.log(`Đã xóa ${p6} dòng lỗi trong bảng Playlist`);

    const p7 = await prisma.$executeRawUnsafe(`DELETE FROM "Department" WHERE "id" > ${MAX_INT}`);
    console.log(`Đã xóa ${p7} dòng lỗi trong bảng Department`);

    console.log('Đã dọn dẹp xong toàn bộ dữ liệu lỗi!');
  } catch (err) {
    console.error('Có lỗi xảy ra:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
