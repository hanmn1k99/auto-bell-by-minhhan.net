import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

const UPLOADS_DIR = path.join(process.cwd(), '..', 'uploads');
const ASSETS_DIR = path.join(process.cwd(), '..', 'assets');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });
fs.mkdirSync(ASSETS_DIR, { recursive: true });

// Audio file storage
const audioStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});
const audioUpload = multer({
  storage: audioStorage,
  fileFilter: (req, file, cb) => {
    const allowed = ['.mp3', '.wav', '.ogg', '.aac', '.flac'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('Only audio files are allowed'));
  },
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
});

// Asset storage (logo, favicon)
const assetStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, ASSETS_DIR),
  filename: (req, file, cb) => {
    const type = (req as any).assetType || 'asset';
    const ext = path.extname(file.originalname);
    cb(null, type + ext);
  },
});
const assetUpload = multer({ storage: assetStorage, limits: { fileSize: 5 * 1024 * 1024 } });

// GET /api/files - list all audio files
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const files = await prisma.audioFile.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(files);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get files' });
  }
});

// POST /api/files/upload - upload audio file
router.post('/upload', authenticateToken, audioUpload.single('audio'), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const { originalname, filename, path: filePath } = req.file;
    const audioFile = await prisma.audioFile.create({
      data: {
        name: req.body.name || path.basename(originalname, path.extname(originalname)),
        filename,
        path: `/uploads/${filename}`,
      },
    });
    res.json(audioFile);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Upload failed' });
  }
});

// DELETE /api/files/:id - delete audio file
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const file = await prisma.audioFile.findUnique({ where: { id: Number(id) } });
    if (!file) return res.status(404).json({ error: 'File not found' });

    const fullPath = path.join(UPLOADS_DIR, file.filename);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);

    await prisma.audioFile.delete({ where: { id: Number(id) } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Delete failed' });
  }
});

// POST /api/files/upload-logo - upload logo
router.post('/upload-logo', authenticateToken, (req: Request, res: Response, next: any) => {
  (req as any).assetType = 'logo';
  next();
}, assetUpload.single('logo'), (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({ url: `/assets/${req.file.filename}` });
});

// POST /api/files/upload-favicon - upload favicon
router.post('/upload-favicon', authenticateToken, (req: Request, res: Response, next: any) => {
  (req as any).assetType = 'favicon';
  next();
}, assetUpload.single('favicon'), (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({ url: `/assets/${req.file.filename}` });
});

// GET /api/files/assets/info - check what assets exist
router.get('/assets/info', (req: Request, res: Response) => {
  const logoExts = ['.png', '.jpg', '.jpeg', '.svg', '.webp'];
  const faviconExts = ['.png', '.ico', '.svg'];

  let logo: string | null = null;
  let favicon: string | null = null;

  for (const ext of logoExts) {
    if (fs.existsSync(path.join(ASSETS_DIR, `logo${ext}`))) { logo = `/assets/logo${ext}`; break; }
  }
  for (const ext of faviconExts) {
    if (fs.existsSync(path.join(ASSETS_DIR, `favicon${ext}`))) { favicon = `/assets/favicon${ext}`; break; }
  }

  res.json({ logo, favicon });
});

export default router;
