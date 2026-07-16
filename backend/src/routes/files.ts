import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma } from '../prisma';
import { authenticateToken } from '../middleware/auth';

const router = Router();

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
    const files = await prisma.audioFile.findMany({ orderBy: { name: 'asc' } });
    res.json(files);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get files' });
  }
});

// POST /api/files/upload - upload audio files
router.post('/upload', authenticateToken, audioUpload.array('audio', 50), async (req: Request, res: Response) => {
  try {
    if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }
    const uploadedFiles = req.files as Express.Multer.File[];
    
    const results = await Promise.all(uploadedFiles.map(async (file) => {
      return prisma.audioFile.create({
        data: {
          name: file.originalname,
          filename: file.filename,
          path: `/uploads/${file.filename}`,
          duration: 0,
        },
      });
    }));
    
    res.json({ success: true, files: results });
  } catch (err) {
    res.status(500).json({ error: 'Failed to upload files' });
  }
});

// POST /api/files/sync - sync files from disk to DB
router.post('/sync', authenticateToken, async (req: Request, res: Response) => {
  try {
    const filesOnDisk = fs.readdirSync(UPLOADS_DIR);
    let addedCount = 0;
    
    // Xóa các file trong DB không còn tồn tại trên disk
    const dbFiles = await prisma.audioFile.findMany();
    for (const dbF of dbFiles) {
      if (!filesOnDisk.includes(dbF.filename)) {
        await prisma.audioFile.delete({ where: { id: dbF.id } });
      }
    }
    
    // Thêm các file trên disk chưa có trong DB
    const updatedDbFiles = await prisma.audioFile.findMany();
    const existingFilenames = updatedDbFiles.map(f => f.filename);
    
    for (const file of filesOnDisk) {
      if (!existingFilenames.includes(file) && file.match(/\.(mp3|wav|ogg|m4a|aac)$/i)) {
        await prisma.audioFile.create({
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
  } catch (err) {
    res.status(500).json({ error: 'Sync failed' });
  }
});

// PUT /api/files/:id - rename audio file
router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    
    const file = await prisma.audioFile.update({
      where: { id: Number(req.params.id) },
      data: { name }
    });
    res.json(file);
  } catch (err) {
    res.status(500).json({ error: 'Failed to rename file' });
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
    const fullPath = path.join(ASSETS_DIR, `logo${ext}`);
    if (fs.existsSync(fullPath)) { 
      const mtime = fs.statSync(fullPath).mtimeMs;
      logo = `/assets/logo${ext}?v=${mtime}`; 
      break; 
    }
  }
  for (const ext of faviconExts) {
    const fullPath = path.join(ASSETS_DIR, `favicon${ext}`);
    if (fs.existsSync(fullPath)) { 
      const mtime = fs.statSync(fullPath).mtimeMs;
      favicon = `/assets/favicon${ext}?v=${mtime}`; 
      break; 
    }
  }

  res.json({ logo, favicon });
});
// DELETE /api/files/assets/:type - delete logo or favicon
router.delete('/assets/:type', authenticateToken, (req: Request, res: Response) => {
  const type = req.params.type;
  if (type !== 'logo' && type !== 'favicon') return res.status(400).json({ error: 'Invalid asset type' });
  
  const exts = type === 'logo' ? ['.png', '.jpg', '.jpeg', '.svg', '.webp'] : ['.png', '.ico', '.svg'];
  let deleted = false;
  for (const ext of exts) {
    const fullPath = path.join(ASSETS_DIR, `${type}${ext}`);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      deleted = true;
    }
  }
  res.json({ success: deleted });
});

export default router;
