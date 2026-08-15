const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Sửa lại đường dẫn tuyệt đối để chạy ở thư mục nào cũng trúng file dev.db
const dbPath = path.join(__dirname, 'prisma', 'dev.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  const MAX_INT = 2147483647;
  console.log(`Bắt đầu dọn dẹp các ID bị lỗi (lớn hơn ${MAX_INT}) tại ${dbPath}...`);

  const handleError = (err) => {
    if (err) console.error("Lỗi khi xóa:", err.message);
  };

  // Xóa các dòng bị lỗi ID quá lớn do thao tác thủ công (tràn số 32-bit)
  db.run(`DELETE FROM "Period" WHERE "audioFileId" > ${MAX_INT} OR "departmentId" > ${MAX_INT} OR "id" > ${MAX_INT}`, handleError);
  db.run(`DELETE FROM "BellConfig" WHERE "audioFileId" > ${MAX_INT} OR "departmentId" > ${MAX_INT} OR "id" > ${MAX_INT}`, handleError);
  db.run(`DELETE FROM "PlaylistItem" WHERE "audioFileId" > ${MAX_INT} OR "playlistId" > ${MAX_INT} OR "id" > ${MAX_INT}`, handleError);
  db.run(`DELETE FROM "Schedule" WHERE "playlistId" > ${MAX_INT} OR "id" > ${MAX_INT}`, handleError);
  
  db.run(`DELETE FROM "AudioFile" WHERE "id" > ${MAX_INT}`, handleError);
  db.run(`DELETE FROM "Playlist" WHERE "id" > ${MAX_INT}`, handleError);
  db.run(`DELETE FROM "Department" WHERE "id" > ${MAX_INT}`, handleError);

  // Đảm bảo in ra log cuối cùng
  db.run(`SELECT 1`, () => {
    console.log('Đã dọn dẹp xong! Vui lòng khởi động lại PM2.');
  });
});

db.close();
