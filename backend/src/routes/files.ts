import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma } from '../prisma';
import { reloadScheduleCache } from '../scheduler';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// GET /api/files/diagnostic
router.get('/diagnostic', (req: Request, res: Response) => {
  try {
    const rootItems = fs.existsSync(UPLOADS_DIR) ? fs.readdirSync(UPLOADS_DIR) : [];
    res.json({
      UPLOADS_DIR,
      ASSETS_DIR,
      __dirname,
      rootItems
    });
  } catch (err: any) {
    res.json({ error: err.message, UPLOADS_DIR, __dirname });
  }
});


const UPLOADS_DIR = path.join(__dirname, '..', '..', '..', 'uploads');
const ASSETS_DIR = path.join(__dirname, '..', '..', '..', 'assets');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });
fs.mkdirSync(ASSETS_DIR, { recursive: true });

// Helper to decode UTF-8 filename if Multer parsed multipart headers as latin1
function getUtf8OriginalName(originalname: string): string {
  if (!originalname) return '';
  try {
    const decoded = Buffer.from(originalname, 'latin1').toString('utf8');
    if (!decoded.includes('\uFFFD')) {
      return decoded;
    }
  } catch {}
  return originalname;
}

// Helper to generate a safe, readable filename on server disk preserving Vietnamese characters
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

// GET /api/files/folders - list all folders
router.get('/folders', authenticateToken, async (req: Request, res: Response) => {
  try {
    const folders = await prisma.folder.findMany({ orderBy: { name: 'asc' } });
    res.json(folders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch folders' });
  }
});

// POST /api/files/folders - create a folder
router.post('/folders', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (!name || name.trim() === '') return res.status(400).json({ error: 'Tên thư mục không hợp lệ' });
    const cleanName = name.trim();
    
    const exists = await prisma.folder.findFirst({ where: { name: cleanName } });
    if (exists) return res.status(400).json({ error: 'Thư mục đã tồn tại' });
    
    const dirPath = path.join(UPLOADS_DIR, cleanName);
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
    
    const folder = await prisma.folder.create({ data: { name: cleanName } });
    res.json(folder);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Lỗi tạo thư mục' });
  }
});

// PUT /api/files/folders/:id - update a folder
router.put('/folders/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (!name || name.trim() === '') return res.status(400).json({ error: 'Tên thư mục không hợp lệ' });
    const cleanName = name.trim();
    const folderId = Number(req.params.id);
    
    const existingFolder = await prisma.folder.findUnique({ where: { id: folderId } });
    if (!existingFolder) return res.status(404).json({ error: 'Không tìm thấy thư mục' });
    
    const duplicate = await prisma.folder.findFirst({ where: { name: cleanName, id: { not: folderId } } });
    if (duplicate) return res.status(400).json({ error: 'Tên thư mục đã tồn tại' });
    
    const oldPath = path.join(UPLOADS_DIR, existingFolder.name);
    const newPath = path.join(UPLOADS_DIR, cleanName);
    if (fs.existsSync(oldPath)) fs.renameSync(oldPath, newPath);
    else fs.mkdirSync(newPath, { recursive: true });
    
    const folder = await prisma.folder.update({ where: { id: folderId }, data: { name: cleanName } });
    
    const files = await prisma.audioFile.findMany({ where: { folderId } });
    for (const f of files) {
      const fileName = path.basename(f.path);
      await prisma.audioFile.update({
        where: { id: f.id },
        data: { path: `/uploads/${encodeURIComponent(cleanName)}/${encodeURIComponent(fileName)}` }
      });
    }
    res.json(folder);
  } catch (err: any) {
    res.status(500).json({ error: 'Lỗi đổi tên thư mục' });
  }
});

// DELETE /api/files/folders/:id - delete a folder
router.delete('/folders/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const folderId = Number(req.params.id);
    const folder = await prisma.folder.findUnique({ where: { id: folderId } });
    if (!folder) return res.status(404).json({ error: 'Không tìm thấy' });
    
    const folderPath = path.join(UPLOADS_DIR, folder.name);
    const files = await prisma.audioFile.findMany({ where: { folderId } });
    for (const f of files) {
      const fileName = path.basename(decodeURIComponent(f.path));
      const currentPhysicalPath = path.join(UPLOADS_DIR, folder.name, fileName);
      const newPhysicalPath = path.join(UPLOADS_DIR, fileName);
      if (fs.existsSync(currentPhysicalPath)) fs.renameSync(currentPhysicalPath, newPhysicalPath);
      
      await prisma.audioFile.update({
        where: { id: f.id },
        data: { folderId: null, path: `/uploads/${encodeURIComponent(fileName)}` }
      });
    }
    
    if (fs.existsSync(folderPath)) {
      try { fs.rmdirSync(folderPath); } catch (e) {}
    }
    
    await prisma.folder.delete({ where: { id: folderId } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi xóa thư mục' });
  }
});

// PUT /api/files/:id/move - move a file to a folder
router.put('/:id/move', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { folderId } = req.body;
    const fileId = Number(req.params.id);
    const file = await prisma.audioFile.findUnique({ where: { id: fileId } });
    if (!file) return res.status(404).json({ error: 'Không tìm thấy file' });
    
    let targetFolder = null;
    if (folderId) {
      targetFolder = await prisma.folder.findUnique({ where: { id: folderId } });
      if (!targetFolder) return res.status(404).json({ error: 'Không tìm thấy thư mục đích' });
    }
    
    const fileName = path.basename(decodeURIComponent(file.path));
    
    let oldPhysicalPath = '';
    const decodedDbPath = decodeURIComponent(file.path);
    if (decodedDbPath.startsWith('/uploads/')) {
      const subPath = decodedDbPath.substring('/uploads/'.length);
      oldPhysicalPath = path.join(UPLOADS_DIR, subPath);
    } else {
      oldPhysicalPath = path.join(UPLOADS_DIR, path.basename(decodedDbPath));
    }
    
    const newPhysicalPath = targetFolder 
      ? path.join(UPLOADS_DIR, targetFolder.name, fileName)
      : path.join(UPLOADS_DIR, fileName);
      
    if (targetFolder) {
      const targetDirPath = path.join(UPLOADS_DIR, targetFolder.name);
      if (!fs.existsSync(targetDirPath)) fs.mkdirSync(targetDirPath, { recursive: true });
    }
      
    if (fs.existsSync(oldPhysicalPath)) {
      fs.renameSync(oldPhysicalPath, newPhysicalPath);
    }
    
    const updatedFile = await prisma.audioFile.update({
      where: { id: fileId },
      data: { 
        folderId: folderId || null,
        path: targetFolder ? `/uploads/${encodeURIComponent(targetFolder.name)}/${encodeURIComponent(fileName)}` : `/uploads/${encodeURIComponent(fileName)}`
      }
    });
    res.json(updatedFile);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Lỗi di chuyển file' });
  }
});

// GET /api/files - list all audio files
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const finalFiles = await prisma.audioFile.findMany({ orderBy: { name: 'asc' } });
    res.json(finalFiles);
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
    const folderId = req.body.folderId && req.body.folderId !== 'null' ? Number(req.body.folderId) : null;
    
    let targetFolder = null;
    if (folderId) {
      targetFolder = await prisma.folder.findUnique({ where: { id: folderId } });
      if (targetFolder) {
        const targetDirPath = path.join(UPLOADS_DIR, targetFolder.name);
        if (!fs.existsSync(targetDirPath)) fs.mkdirSync(targetDirPath, { recursive: true });
      }
    }
    
    const results = await Promise.all(uploadedFiles.map(async (file) => {
      const utf8Name = getUtf8OriginalName(file.originalname);
      const ext = path.extname(utf8Name);
      const displayName = path.basename(utf8Name, ext);
      
      let finalPath = `/uploads/${encodeURIComponent(file.filename)}`;
      if (targetFolder) {
        const oldPhysicalPath = path.join(UPLOADS_DIR, file.filename);
        const newPhysicalPath = path.join(UPLOADS_DIR, targetFolder.name, file.filename);
        if (fs.existsSync(oldPhysicalPath)) {
          fs.renameSync(oldPhysicalPath, newPhysicalPath);
        }
        finalPath = `/uploads/${encodeURIComponent(targetFolder.name)}/${encodeURIComponent(file.filename)}`;
      }

      return prisma.audioFile.create({
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
  } catch (err: any) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message || 'Lỗi tải tệp lên' });
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
