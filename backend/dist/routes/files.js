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
const UPLOADS_DIR = path_1.default.join(process.cwd(), '..', 'uploads');
const ASSETS_DIR = path_1.default.join(process.cwd(), '..', 'assets');
fs_1.default.mkdirSync(UPLOADS_DIR, { recursive: true });
fs_1.default.mkdirSync(ASSETS_DIR, { recursive: true });
// Audio file storage
const audioStorage = multer_1.default.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, unique + path_1.default.extname(file.originalname));
    },
});
const audioUpload = (0, multer_1.default)({
    storage: audioStorage,
    fileFilter: (req, file, cb) => {
        const allowed = ['.mp3', '.wav', '.ogg', '.aac', '.flac'];
        if (allowed.includes(path_1.default.extname(file.originalname).toLowerCase()))
            cb(null, true);
        else
            cb(new Error('Only audio files are allowed'));
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
// GET /api/files - list all audio files
router.get('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const files = await prisma_1.prisma.audioFile.findMany({ orderBy: { name: 'asc' } });
        res.json(files);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to get files' });
    }
});
// POST /api/files/upload - upload audio files
router.post('/upload', auth_1.authenticateToken, audioUpload.array('audio', 50), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }
        const uploadedFiles = req.files;
        const results = await Promise.all(uploadedFiles.map(async (file) => {
            return prisma_1.prisma.audioFile.create({
                data: {
                    name: file.originalname,
                    filename: file.filename,
                    path: `/uploads/${file.filename}`,
                    duration: 0,
                },
            });
        }));
        res.json({ success: true, files: results });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to upload files' });
    }
});
// POST /api/files/sync - sync files from disk to DB
router.post('/sync', auth_1.authenticateToken, async (req, res) => {
    try {
        const filesOnDisk = fs_1.default.readdirSync(UPLOADS_DIR);
        let addedCount = 0;
        // Xóa các file trong DB không còn tồn tại trên disk
        const dbFiles = await prisma_1.prisma.audioFile.findMany();
        for (const dbF of dbFiles) {
            if (!filesOnDisk.includes(dbF.filename)) {
                await prisma_1.prisma.audioFile.delete({ where: { id: dbF.id } });
            }
        }
        // Thêm các file trên disk chưa có trong DB
        const updatedDbFiles = await prisma_1.prisma.audioFile.findMany();
        const existingFilenames = updatedDbFiles.map(f => f.filename);
        for (const file of filesOnDisk) {
            if (!existingFilenames.includes(file) && file.match(/\.(mp3|wav|ogg|m4a|aac)$/i)) {
                await prisma_1.prisma.audioFile.create({
                    data: {
                        name: file,
                        filename: file,
                        path: `/uploads/${file}`,
                        duration: 0,
                    }
                });
                addedCount++;
            }
        }
        res.json({ success: true, addedCount });
    }
    catch (err) {
        res.status(500).json({ error: 'Sync failed' });
    }
});
// PUT /api/files/:id - rename audio file
router.put('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const { name } = req.body;
        if (!name)
            return res.status(400).json({ error: 'Name is required' });
        const file = await prisma_1.prisma.audioFile.update({
            where: { id: Number(req.params.id) },
            data: { name }
        });
        res.json(file);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to rename file' });
    }
});
// DELETE /api/files/:id - delete audio file
router.delete('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const file = await prisma_1.prisma.audioFile.findUnique({ where: { id: Number(id) } });
        if (!file)
            return res.status(404).json({ error: 'File not found' });
        const fullPath = path_1.default.join(UPLOADS_DIR, file.filename);
        if (fs_1.default.existsSync(fullPath))
            fs_1.default.unlinkSync(fullPath);
        await prisma_1.prisma.audioFile.delete({ where: { id: Number(id) } });
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ error: 'Delete failed' });
    }
});
// POST /api/files/upload-logo - upload logo
router.post('/upload-logo', auth_1.authenticateToken, (req, res, next) => {
    req.assetType = 'logo';
    next();
}, assetUpload.single('logo'), (req, res) => {
    if (!req.file)
        return res.status(400).json({ error: 'No file uploaded' });
    res.json({ url: `/assets/${req.file.filename}` });
});
// POST /api/files/upload-favicon - upload favicon
router.post('/upload-favicon', auth_1.authenticateToken, (req, res, next) => {
    req.assetType = 'favicon';
    next();
}, assetUpload.single('favicon'), (req, res) => {
    if (!req.file)
        return res.status(400).json({ error: 'No file uploaded' });
    res.json({ url: `/assets/${req.file.filename}` });
});
// GET /api/files/assets/info - check what assets exist
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
// DELETE /api/files/assets/:type - delete logo or favicon
router.delete('/assets/:type', auth_1.authenticateToken, (req, res) => {
    const type = req.params.type;
    if (type !== 'logo' && type !== 'favicon')
        return res.status(400).json({ error: 'Invalid asset type' });
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
