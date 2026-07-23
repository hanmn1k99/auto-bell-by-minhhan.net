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

// Helper to decode UTF-8 filename if Multer decoded it as latin1
function getUtf8OriginalName(originalname: string): string {
  try {
    const decoded = Buffer.from(originalname, 'latin1').toString('utf8');
    if (!decoded.includes('')) return decoded;
  } catch {}
  return originalname;
}

// Helper to generate a safe, readable filename on server disk
function getSafeServerFilename(originalNameUtf8: string): string {
  const ext = path.extname(originalNameUtf8);
  let base = path.basename(originalNameUtf8, ext)
    .replace(/[/\\?%*:|"<>]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
  if (!base) base = 'audio';

  let filename = `${base}${ext}`;
  let counter = 1;
  while (fs.existsSync(path.join(UPLOADS_DIR, filename))) {
    filename = `${base}_${counter}${ext}`;
    counter++;
  }
  return filename;
}

// Audio file storage preserving original readable UTF-8 filename
const audioStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const utf8Name = getUtf8OriginalName(file.originalname);
    const safeName = getSafeServerFilename(utf8Name);
    cb(null, safeName);
  },
});

const audioUpload = multer({
  storage: audioStorage,
  fileFilter: (req, file, cb) => {
    const allowed = ['.mp3', '.wav', '.ogg', '.aac', '.flac', '.m4a'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Chỉ chấp nhận các định dạng tệp âm thanh (mp3, wav, ogg, aac, flac, m4a)'));
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
    res.status(500).json({ error: 'Không thể lấy danh sách tệp' });
  }
});

// POST /api/files/upload - upload audio files
router.post('/upload', authenticateToken, audioUpload.array('audio', 50), async (req: Request, res: Response) => {
  try {
    if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
      return res.status(400).json({ error: 'Không có tệp nào được tải lên' });
    }
    const uploadedFiles = req.files as Express.Multer.File[];
    
    const results = await Promise.all(uploadedFiles.map(async (file) => {
      const utf8Name = getUtf8OriginalName(file.originalname);
      return prisma.audioFile.create({
        data: {
          name: utf8Name,
          filename: file.filename,
          path: `/uploads/${file.filename}`,
          duration: 0,
        },
      });
    }));
    
    res.json({ success: true, files: results });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Lỗi tải tệp lên máy chủ' });
  }
});

// POST /api/files/sync - sync files from disk to DB
router.post('/sync', authenticateToken, async (req: Request, res: Response) => {
  try {
    const filesOnDisk = fs.readdirSync(UPLOADS_DIR);
    let addedCount = 0;
    let deletedCount = 0;
    
    const diskFileSet = new Set(filesOnDisk.map(f => f.normalize('NFC')));
    
    // 1. Remove DB entries for files no longer existing on server disk
    const dbFiles = await prisma.audioFile.findMany();
    for (const dbF of dbFiles) {
      const normalizedFilename = dbF.filename.normalize('NFC');
      if (!diskFileSet.has(normalizedFilename) && !filesOnDisk.includes(dbF.filename)) {
        try {
          await prisma.playlistItem.deleteMany({ where: { audioFileId: dbF.id } });
          await prisma.audioFile.delete({ where: { id: dbF.id } });
          deletedCount++;
        } catch (dbErr) {
          console.error(`Cannot remove orphaned file ID ${dbF.id} (${dbF.filename}):`, dbErr);
        }
      }
    }
    
    // 2. Add unindexed disk files to DB
    const updatedDbFiles = await prisma.audioFile.findMany();
    const existingFilenames = new Set(updatedDbFiles.map(f => f.filename.normalize('NFC')));
    
    for (const file of filesOnDisk) {
      const normalizedFile = file.normalize('NFC');
      if (!existingFilenames.has(normalizedFile) && file.match(/\.(mp3|wav|ogg|m4a|aac|flac)$/i)) {
        const ext = path.extname(file);
        const displayName = path.basename(file, ext);
        await prisma.audioFile.create({
          data: {
            name: displayName,
            filename: file,
            path: `/uploads/${file}`,
            duration: 0,
          }
        });
        addedCount++;
      }
    }
    
    res.json({ success: true, addedCount, deletedCount });
  } catch (err: any) {
    console.error('Sync failed:', err);
    res.status(500).json({ error: 'Đồng bộ thất bại: ' + (err.message || 'Lỗi không xác định') });
  }
});

// PUT /api/files/:id - rename audio file
router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Tên tệp không được để trống' });
    
    const file = await prisma.audioFile.update({
      where: { id: Number(req.params.id) },
      data: { name }
    });
    res.json(file);
  } catch (err) {
    res.status(500).json({ error: 'Không thể đổi tên tệp' });
  }
});

// DELETE /api/files/:id - delete single audio file
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const file = await prisma.audioFile.findUnique({
      where: { id },
      include: { bells: true, periods: true }
    });
    if (!file) return res.status(404).json({ error: 'Tệp không tồn tại' });

    if (file.bells.length > 0 || file.periods.length > 0) {
      return res.status(400).json({
        error: `Không thể xóa tệp "${file.name}" vì đang được sử dụng trong ${file.bells.length} chuông báo hoặc ${file.periods.length} tiết học.`
      });
    }

    const fullPath = path.join(UPLOADS_DIR, file.filename);
    if (fs.existsSync(fullPath)) {
      try { fs.unlinkSync(fullPath); } catch (e) { console.error('Unlink error:', e); }
    }

    await prisma.playlistItem.deleteMany({ where: { audioFileId: id } });
    await prisma.audioFile.delete({ where: { id } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Xóa tệp thất bại' });
  }
});

// POST /api/files/bulk-delete - bulk delete audio files
router.post('/bulk-delete', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Vui lòng chọn ít nhất 1 tệp để xóa' });
    }

    let deletedCount = 0;
    const skippedFiles: string[] = [];

    for (const id of ids) {
      const file = await prisma.audioFile.findUnique({
        where: { id: Number(id) },
        include: { bells: true, periods: true }
      });
      if (!file) continue;

      if (file.bells.length > 0 || file.periods.length > 0) {
        skippedFiles.push(file.name);
        continue;
      }

      const fullPath = path.join(UPLOADS_DIR, file.filename);
      if (fs.existsSync(fullPath)) {
        try { fs.unlinkSync(fullPath); } catch {}
      }

      await prisma.playlistItem.deleteMany({ where: { audioFileId: file.id } });
      await prisma.audioFile.delete({ where: { id: file.id } });
      deletedCount++;
    }

    res.json({ success: true, deletedCount, skippedFiles });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Lỗi xóa nhiều tệp' });
  }
});

// POST /api/files/upload-logo - upload logo
router.post('/upload-logo', authenticateToken, (req: Request, res: Response, next: any) => {
  (req as any).assetType = 'logo';
  next();
}, assetUpload.single('logo'), (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ error: 'Không có file logo nào được tải lên' });
  res.json({ url: `/assets/${req.file.filename}` });
});

// POST /api/files/upload-favicon - upload favicon
router.post('/upload-favicon', authenticateToken, (req: Request, res: Response, next: any) => {
  (req as any).assetType = 'favicon';
  next();
}, assetUpload.single('favicon'), (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ error: 'Không có file favicon nào được tải lên' });
  res.json({ url: `/assets/${req.file.filename}` });
});

// GET /api/files/manifest.json - Dynamic PWA manifest based on uploaded favicon
router.get('/manifest.json', (req: Request, res: Response) => {
  const faviconExts = ['.png', '.ico', '.svg', '.webp', '.jpg', '.jpeg'];
  let iconUrl = '/favicon.svg';

  for (const ext of faviconExts) {
    const fullPath = path.join(ASSETS_DIR, `favicon${ext}`);
    if (fs.existsSync(fullPath)) { 
      iconUrl = `/assets/favicon${ext}`;
      break; 
    }
  }

  let type = "image/png";
  if (iconUrl.endsWith('.svg')) type = "image/svg+xml";
  else if (iconUrl.endsWith('.ico')) type = "image/x-icon";
  else if (iconUrl.endsWith('.webp')) type = "image/webp";
  else if (iconUrl.endsWith('.jpg') || iconUrl.endsWith('.jpeg')) type = "image/jpeg";

  res.json({
    name: "AutoBells by minhhan.net",
    short_name: "AutoBells",
    description: "Hệ thống chuông báo tự động",
    start_url: "/",
    display: "standalone",
    background_color: "#030712",
    theme_color: "#030712",
    icons: [
      { src: iconUrl, sizes: "any", type, purpose: "any maskable" },
      { src: iconUrl, sizes: "192x192", type, purpose: "any" },
      { src: iconUrl, sizes: "512x512", type, purpose: "any" }
    ]
  });
});

// GET /api/files/assets/info - check assets
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

// DELETE /api/files/assets/:type - delete asset
router.delete('/assets/:type', authenticateToken, (req: Request, res: Response) => {
  const type = req.params.type;
  if (type !== 'logo' && type !== 'favicon') return res.status(400).json({ error: 'Loại asset không hợp lệ' });
  
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
