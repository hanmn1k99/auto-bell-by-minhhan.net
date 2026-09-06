const fs = require('fs');
const path = require('path');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });
const songPath = path.join(UPLOADS_DIR, 'test_song.mp3');
fs.writeFileSync(songPath, 'test content');

// simulate the move
const filePathFromDb = '/uploads/test_song.mp3';
let oldPhysicalPath = '';
const decodedDbPath = decodeURIComponent(filePathFromDb);
if (decodedDbPath.startsWith('/uploads/')) {
    const subPath = decodedDbPath.substring('/uploads/'.length);
    oldPhysicalPath = path.join(UPLOADS_DIR, subPath);
}
console.log("oldPhysicalPath:", oldPhysicalPath);
console.log("Exists?", fs.existsSync(oldPhysicalPath));

const targetFolder = 'My Folder';
const targetDirPath = path.join(UPLOADS_DIR, targetFolder);
if (!fs.existsSync(targetDirPath)) fs.mkdirSync(targetDirPath, { recursive: true });

const newPhysicalPath = path.join(UPLOADS_DIR, targetFolder, 'test_song.mp3');
fs.renameSync(oldPhysicalPath, newPhysicalPath);
console.log("Moved to:", newPhysicalPath);
console.log("Exists new?", fs.existsSync(newPhysicalPath));