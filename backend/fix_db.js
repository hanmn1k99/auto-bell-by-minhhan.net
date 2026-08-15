const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./prisma/dev.db');

db.serialize(() => {
  const MAX_INT = 2147483647;
  console.log(`Bắt đầu dọn dẹp các ID bị lỗi (lớn hơn ${MAX_INT})...`);

  // Xóa các dòng bị lỗi ID quá lớn do thao tác thủ công (tràn số 32-bit)
  db.run(`DELETE FROM "Period" WHERE "audioFileId" > ${MAX_INT} OR "departmentId" > ${MAX_INT} OR "id" > ${MAX_INT}`);
  db.run(`DELETE FROM "BellConfig" WHERE "audioFileId" > ${MAX_INT} OR "departmentId" > ${MAX_INT} OR "id" > ${MAX_INT}`);
  db.run(`DELETE FROM "PlaylistItem" WHERE "audioFileId" > ${MAX_INT} OR "playlistId" > ${MAX_INT} OR "id" > ${MAX_INT}`);
  db.run(`DELETE FROM "Schedule" WHERE "playlistId" > ${MAX_INT} OR "id" > ${MAX_INT}`);
  
  db.run(`DELETE FROM "AudioFile" WHERE "id" > ${MAX_INT}`);
  db.run(`DELETE FROM "Playlist" WHERE "id" > ${MAX_INT}`);
  db.run(`DELETE FROM "Department" WHERE "id" > ${MAX_INT}`);

  console.log('Đã dọn dẹp xong! Vui lòng khởi động lại PM2.');
});

db.close();
