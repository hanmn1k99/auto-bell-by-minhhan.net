const fs = require('fs');
const path = require('path');
const UPLOADS_DIR = path.join(__dirname, '..', '..', '..', 'uploads');
console.log("UPLOADS_DIR is:", UPLOADS_DIR);
const testFolder = path.join(UPLOADS_DIR, 'test_folder_123');
fs.mkdirSync(testFolder, { recursive: true });
console.log("Created:", testFolder);
console.log("Exists?", fs.existsSync(testFolder));