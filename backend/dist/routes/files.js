"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// GET /api/files/diagnostic
router.get('/diagnostic', (req, res) => {
    try {
        const rootItems = fs_1.default.existsSync(UPLOADS_DIR) ? fs_1.default.readdirSync(UPLOADS_DIR) : [];
        res.json({
            UPLOADS_DIR,
            ASSETS_DIR,
            __dirname,
            rootItems
        });
    }
    catch (err) {
        res.json({ error: err.message, UPLOADS_DIR, __dirname });
    }
});
const UPLOADS_DIR = path_1.default.join(__dirname, '..', '..', '..', 'uploads');
const ASSETS_DIR = path_1.default.join(__dirname, '..', '..', '..', 'assets');
fs_1.default.mkdirSync(UPLOADS_DIR, { recursive: true });
fs_1.default.mkdirSync(ASSETS_DIR, { recursive: true });
// Helper to decode UTF-8 filename if Multer parsed multipart headers as latin1
function getUtf8OriginalName(originalname) {
    if (!originalname)
        return '';
    try {
        const decoded = Buffer.from(originalname, 'latin1').toString('utf8');
        if (!decoded.includes('\uFFFD')) {
            return decoded;
        }
    }
    catch { }
    return originalname;
}
// Helper to generate a safe, readable filename on server disk preserving Vietnamese characters
function getSafeServerFilename(originalNameUtf8) {
    const ext = path_1.default.extname(originalNameUtf8);
    let base = path_1.default.basename(originalNameUtf8, ext)
        .replace(/[/\\?%*:|"<>]/g, '_')
        .replace(/\s+/g, ' ')
        .trim();
    if (!base)
        base = 'audio';
    let filename = `${base}${ext}`;
    let counter = 1;
    while (fs_1.default.existsSync(path_1.default.join(UPLOADS_DIR, filename))) {
        filename = `${base}_${counter}${ext}`;
        counter++;
    }
    return filename;
}
// Audio file storage preserving original readable UTF-8 filename
const audioStorage = multer_1.default.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => {
        const utf8Name = getUtf8OriginalName(file.originalname);
        const safeName = getSafeServerFilename(utf8Name);
        cb(null, safeName);
    },
});
const audioUpload = (0, multer_1.default)({
    storage: audioStorage,
    fileFilter: (req, file, cb) => {
        const allowed = ['.mp3', '.wav', '.ogg', '.aac', '.flac', '.m4a'];
        const ext = path_1.default.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext))
            cb(null, true);
        else
            cb(new Error('Chỉ chấp nhận các định dạng tệp âm thanh (mp3, wav, ogg, aac, flac, m4a)'));
    },
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
});
// Asset storage (logo, favicon)
const assetStorage = multer_1.default.diskStorage({
    destination: (req, file, cb) => cb(null, ASSETS_DIR),
    filename: (req, file, cb) => {
        const type = req.assetType || 'asset';
        const ext = path_1.default.extname(file.originalname);
        cb(null, type + ext);
    },
});
const assetUpload = (0, multer_1.default)({ storage: assetStorage, limits: { fileSize: 5 * 1024 * 1024 } });
// GET /api/files/folders - list all folders
router.get('/folders', auth_1.authenticateToken, async (req, res) => {
    try {
        const folders = await prisma_1.prisma.folder.findMany({ orderBy: { name: 'asc' } });
        res.json(folders);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch folders' });
    }
});
// POST /api/files/folders - create a folder
router.post('/folders', auth_1.authenticateToken, async (req, res) => {
    try {
        const { name } = req.body;
        if (!name || name.trim() === '')
            return res.status(400).json({ error: 'Tên thư mục không hợp lệ' });
        const cleanName = name.trim();
        const exists = await prisma_1.prisma.folder.findFirst({ where: { name: cleanName } });
        if (exists)
            return res.status(400).json({ error: 'Thư mục đã tồn tại' });
        const dirPath = path_1.default.join(UPLOADS_DIR, cleanName);
        if (!fs_1.default.existsSync(dirPath))
            fs_1.default.mkdirSync(dirPath, { recursive: true });
        const folder = await prisma_1.prisma.folder.create({ data: { name: cleanName } });
        res.json(folder);
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Lỗi tạo thư mục' });
    }
});
// PUT /api/files/folders/:id - update a folder
router.put('/folders/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const { name } = req.body;
        if (!name || name.trim() === '')
            return res.status(400).json({ error: 'Tên thư mục không hợp lệ' });
        const cleanName = name.trim();
        const folderId = Number(req.params.id);
        const existingFolder = await prisma_1.prisma.folder.findUnique({ where: { id: folderId } });
        if (!existingFolder)
            return res.status(404).json({ error: 'Không tìm thấy thư mục' });
        const duplicate = await prisma_1.prisma.folder.findFirst({ where: { name: cleanName, id: { not: folderId } } });
        if (duplicate)
            return res.status(400).json({ error: 'Tên thư mục đã tồn tại' });
        const oldPath = path_1.default.join(UPLOADS_DIR, existingFolder.name);
        const newPath = path_1.default.join(UPLOADS_DIR, cleanName);
        if (fs_1.default.existsSync(oldPath))
            fs_1.default.renameSync(oldPath, newPath);
        else
            fs_1.default.mkdirSync(newPath, { recursive: true });
        const folder = await prisma_1.prisma.folder.update({ where: { id: folderId }, data: { name: cleanName } });
        const files = await prisma_1.prisma.audioFile.findMany({ where: { folderId } });
        for (const f of files) {
            const fileName = path_1.default.basename(f.path);
            await prisma_1.prisma.audioFile.update({
                where: { id: f.id },
                data: { path: `/uploads/${encodeURIComponent(cleanName)}/${encodeURIComponent(fileName)}` }
            });
        }
        res.json(folder);
    }
    catch (err) {
        res.status(500).json({ error: 'Lỗi đổi tên thư mục' });
    }
});
// DELETE /api/files/folders/:id - delete a folder
router.delete('/folders/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const folderId = Number(req.params.id);
        const folder = await prisma_1.prisma.folder.findUnique({ where: { id: folderId } });
        if (!folder)
            return res.status(404).json({ error: 'Không tìm thấy' });
        const folderPath = path_1.default.join(UPLOADS_DIR, folder.name);
        const files = await prisma_1.prisma.audioFile.findMany({ where: { folderId } });
        for (const f of files) {
            const fileName = path_1.default.basename(decodeURIComponent(f.path));
            const currentPhysicalPath = path_1.default.join(UPLOADS_DIR, folder.name, fileName);
            const newPhysicalPath = path_1.default.join(UPLOADS_DIR, fileName);
            if (fs_1.default.existsSync(currentPhysicalPath))
                fs_1.default.renameSync(currentPhysicalPath, newPhysicalPath);
            await prisma_1.prisma.audioFile.update({
                where: { id: f.id },
                data: { folderId: null, path: `/uploads/${encodeURIComponent(fileName)}` }
            });
        }
        if (fs_1.default.existsSync(folderPath)) {
            try {
                fs_1.default.rmdirSync(folderPath);
            }
            catch (e) { }
        }
        await prisma_1.prisma.folder.delete({ where: { id: folderId } });
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ error: 'Lỗi xóa thư mục' });
    }
});
// PUT /api/files/:id/move - move a file to a folder
router.put('/:id/move', auth_1.authenticateToken, async (req, res) => {
    try {
        const { folderId } = req.body;
        const fileId = Number(req.params.id);
        const file = await prisma_1.prisma.audioFile.findUnique({ where: { id: fileId } });
        if (!file)
            return res.status(404).json({ error: 'Không tìm thấy file' });
        let targetFolder = null;
        if (folderId) {
            targetFolder = await prisma_1.prisma.folder.findUnique({ where: { id: folderId } });
            if (!targetFolder)
                return res.status(404).json({ error: 'Không tìm thấy thư mục đích' });
        }
        const fileName = path_1.default.basename(decodeURIComponent(file.path));
        let oldPhysicalPath = '';
        const decodedDbPath = decodeURIComponent(file.path);
        if (decodedDbPath.startsWith('/uploads/')) {
            const subPath = decodedDbPath.substring('/uploads/'.length);
            oldPhysicalPath = path_1.default.join(UPLOADS_DIR, subPath);
        }
        else {
            oldPhysicalPath = path_1.default.join(UPLOADS_DIR, path_1.default.basename(decodedDbPath));
        }
        const newPhysicalPath = targetFolder
            ? path_1.default.join(UPLOADS_DIR, targetFolder.name, fileName)
            : path_1.default.join(UPLOADS_DIR, fileName);
        if (targetFolder) {
            const targetDirPath = path_1.default.join(UPLOADS_DIR, targetFolder.name);
            if (!fs_1.default.existsSync(targetDirPath))
                fs_1.default.mkdirSync(targetDirPath, { recursive: true });
        }
        if (fs_1.default.existsSync(oldPhysicalPath)) {
            fs_1.default.renameSync(oldPhysicalPath, newPhysicalPath);
        }
        const updatedFile = await prisma_1.prisma.audioFile.update({
            where: { id: fileId },
            data: {
                folderId: folderId || null,
                path: targetFolder ? `/uploads/${encodeURIComponent(targetFolder.name)}/${encodeURIComponent(fileName)}` : `/uploads/${encodeURIComponent(fileName)}`
            }
        });
        res.json(updatedFile);
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Lỗi di chuyển file' });
    }
});
// GET /api/files - list all audio files
router.get('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const finalFiles = await prisma_1.prisma.audioFile.findMany({ orderBy: { name: 'asc' } });
        res.json(finalFiles);
    }
    catch (err) {
        res.status(500).json({ error: 'Không thể lấy danh sách tệp' });
    }
});
// POST /api/files/upload - upload audio files
router.post('/upload', auth_1.authenticateToken, audioUpload.array('audio', 50), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'Không có tệp nào được tải lên' });
        }
        const uploadedFiles = req.files;
        const folderId = req.body.folderId && req.body.folderId !== 'null' ? Number(req.body.folderId) : null;
        let targetFolder = null;
        if (folderId) {
            targetFolder = await prisma_1.prisma.folder.findUnique({ where: { id: folderId } });
            if (targetFolder) {
                const targetDirPath = path_1.default.join(UPLOADS_DIR, targetFolder.name);
                if (!fs_1.default.existsSync(targetDirPath))
                    fs_1.default.mkdirSync(targetDirPath, { recursive: true });
            }
        }
        const results = await Promise.all(uploadedFiles.map(async (file) => {
            const utf8Name = getUtf8OriginalName(file.originalname);
            const ext = path_1.default.extname(utf8Name);
            const displayName = path_1.default.basename(utf8Name, ext);
            let finalPath = `/uploads/${encodeURIComponent(file.filename)}`;
            if (targetFolder) {
                const oldPhysicalPath = path_1.default.join(UPLOADS_DIR, file.filename);
                const newPhysicalPath = path_1.default.join(UPLOADS_DIR, targetFolder.name, file.filename);
                if (fs_1.default.existsSync(oldPhysicalPath)) {
                    fs_1.default.renameSync(oldPhysicalPath, newPhysicalPath);
                }
                finalPath = `/uploads/${encodeURIComponent(targetFolder.name)}/${encodeURIComponent(file.filename)}`;
            }
            return prisma_1.prisma.audioFile.create({
                data: {
                    name: displayName || utf8Name,
                    filename: file.filename,
                    path: finalPath,
                    duration: 0,
                    folderId: folderId
                },
            });
        }));
        res.json({ success: true, files: results });
    }
    catch (err) {
        console.error('Upload error:', err);
        res.status(500).json({ error: err.message || 'Lỗi tải tệp lên' });
    }
});
// POST /api/files/upload-logo - upload logo
router.post('/upload-logo', auth_1.authenticateToken, (req, res, next) => {
    req.assetType = 'logo';
    next();
}, assetUpload.single('logo'), (req, res) => {
    if (!req.file)
        return res.status(400).json({ error: 'Không có file logo nào được tải lên' });
    res.json({ url: `/assets/${req.file.filename}` });
});
// POST /api/files/upload-favicon - upload favicon
router.post('/upload-favicon', auth_1.authenticateToken, (req, res, next) => {
    req.assetType = 'favicon';
    next();
}, assetUpload.single('favicon'), (req, res) => {
    if (!req.file)
        return res.status(400).json({ error: 'Không có file favicon nào được tải lên' });
    res.json({ url: `/assets/${req.file.filename}` });
});
// GET /api/files/manifest.json - Dynamic PWA manifest based on uploaded favicon
router.get('/manifest.json', (req, res) => {
    const faviconExts = ['.png', '.ico', '.svg', '.webp', '.jpg', '.jpeg'];
    let iconUrl = '/favicon.svg';
    for (const ext of faviconExts) {
        const fullPath = path_1.default.join(ASSETS_DIR, `favicon${ext}`);
        if (fs_1.default.existsSync(fullPath)) {
            iconUrl = `/assets/favicon${ext}`;
            break;
        }
    }
    let type = "image/png";
    if (iconUrl.endsWith('.svg'))
        type = "image/svg+xml";
    else if (iconUrl.endsWith('.ico'))
        type = "image/x-icon";
    else if (iconUrl.endsWith('.webp'))
        type = "image/webp";
    else if (iconUrl.endsWith('.jpg') || iconUrl.endsWith('.jpeg'))
        type = "image/jpeg";
    const isPlayer = req.query.page === 'player' || (req.headers.referer && req.headers.referer.includes('/player'));
    const startUrl = isPlayer ? '/player' : '/';
    const appName = isPlayer ? 'Automation Audio System by minhhan.net' : 'AAS | Dashboard';
    const shortName = isPlayer ? 'AAS Player' : 'AAS Admin';
    res.json({
        name: appName,
        short_name: shortName,
        description: "Automated Audio Control System",
        start_url: startUrl,
        scope: isPlayer ? '/player' : '/',
        display: "standalone",
        background_color: "#030712",
        theme_color: "#030712",
        icons: [
            { src: iconUrl, sizes: "any", type, purpose: "any maskable" },
            { src: iconUrl, sizes: "192x192", type, purpose: "any" },
            { src: iconUrl, sizes: "512x512", type, purpose: "any" }
        ],
        shortcuts: [
            {
                name: "Màn hình Phát nhạc",
                short_name: "Player",
                url: "/player",
                icons: [{ src: iconUrl, sizes: "192x192" }]
            },
            {
                name: "Quản trị Admin",
                short_name: "Admin",
                url: "/",
                icons: [{ src: iconUrl, sizes: "192x192" }]
            }
        ]
    });
});
// GET /api/files/assets/info - check assets
router.get('/assets/info', (req, res) => {
    const logoExts = ['.png', '.jpg', '.jpeg', '.svg', '.webp'];
    const faviconExts = ['.png', '.ico', '.svg'];
    let logo = null;
    let favicon = null;
    for (const ext of logoExts) {
        const fullPath = path_1.default.join(ASSETS_DIR, `logo${ext}`);
        if (fs_1.default.existsSync(fullPath)) {
            const mtime = fs_1.default.statSync(fullPath).mtimeMs;
            logo = `/assets/logo${ext}?v=${mtime}`;
            break;
        }
    }
    for (const ext of faviconExts) {
        const fullPath = path_1.default.join(ASSETS_DIR, `favicon${ext}`);
        if (fs_1.default.existsSync(fullPath)) {
            const mtime = fs_1.default.statSync(fullPath).mtimeMs;
            favicon = `/assets/favicon${ext}?v=${mtime}`;
            break;
        }
    }
    res.json({ logo, favicon });
});
// DELETE /api/files/assets/:type - delete asset
router.delete('/assets/:type', auth_1.authenticateToken, (req, res) => {
    const type = req.params.type;
    if (type !== 'logo' && type !== 'favicon')
        return res.status(400).json({ error: 'Loại asset không hợp lệ' });
    const exts = type === 'logo' ? ['.png', '.jpg', '.jpeg', '.svg', '.webp'] : ['.png', '.ico', '.svg'];
    let deleted = false;
    for (const ext of exts) {
        const fullPath = path_1.default.join(ASSETS_DIR, `${type}${ext}`);
        if (fs_1.default.existsSync(fullPath)) {
            fs_1.default.unlinkSync(fullPath);
            deleted = true;
        }
    }
    res.json({ success: deleted });
});
exports.default = router;
