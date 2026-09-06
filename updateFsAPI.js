const fs = require('fs');
let code = fs.readFileSync('backend/src/routes/files.ts', 'utf8');

const createFolderRegex = /\/\/ POST \/api\/files\/folders - create a folder[\s\S]*?\}\);/g;
const newCreateFolder = `// POST /api/files/folders - create a folder
router.post('/folders', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (!name || name.trim() === '') return res.status(400).json({ error: 'Tên thư mục không hợp lệ' });
    const cleanName = name.trim();
    
    // Check if folder exists in DB
    const exists = await prisma.folder.findFirst({ where: { name: cleanName } });
    if (exists) return res.status(400).json({ error: 'Thư mục đã tồn tại' });
    
    // Create physical folder if not exists
    const dirPath = path.join(UPLOADS_DIR, cleanName);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    
    const folder = await prisma.folder.create({ data: { name: cleanName } });
    res.json(folder);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Lỗi tạo thư mục' });
  }
});`;
code = code.replace(createFolderRegex, newCreateFolder);

const updateFolderRegex = /\/\/ PUT \/api\/files\/folders\/:id - update a folder[\s\S]*?\}\);/g;
const newUpdateFolder = `// PUT /api/files/folders/:id - update a folder
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
    
    // Rename physical folder
    const oldPath = path.join(UPLOADS_DIR, existingFolder.name);
    const newPath = path.join(UPLOADS_DIR, cleanName);
    if (fs.existsSync(oldPath)) {
      fs.renameSync(oldPath, newPath);
    } else {
      fs.mkdirSync(newPath, { recursive: true }); // in case physical folder was manually deleted
    }
    
    const folder = await prisma.folder.update({
      where: { id: folderId },
      data: { name: cleanName }
    });
    
    // Update path for all files in this folder
    const files = await prisma.audioFile.findMany({ where: { folderId } });
    for (const f of files) {
      const fileName = path.basename(f.path);
      await prisma.audioFile.update({
        where: { id: f.id },
        data: { path: \`/uploads/\${cleanName}/\${fileName}\` }
      });
    }
    
    res.json(folder);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi đổi tên thư mục' });
  }
});`;
code = code.replace(updateFolderRegex, newUpdateFolder);

const delFolderRegex = /\/\/ DELETE \/api\/files\/folders\/:id - delete a folder[\s\S]*?\}\);/g;
const newDelFolder = `// DELETE /api/files/folders/:id - delete a folder
router.delete('/folders/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const folderId = Number(req.params.id);
    const folder = await prisma.folder.findUnique({ where: { id: folderId } });
    if (!folder) return res.status(404).json({ error: 'Không tìm thấy' });
    
    // Move physical files back to root
    const folderPath = path.join(UPLOADS_DIR, folder.name);
    const files = await prisma.audioFile.findMany({ where: { folderId } });
    for (const f of files) {
      const fileName = path.basename(f.path);
      const currentPhysicalPath = path.join(UPLOADS_DIR, folder.name, fileName);
      const newPhysicalPath = path.join(UPLOADS_DIR, fileName);
      if (fs.existsSync(currentPhysicalPath)) {
        fs.renameSync(currentPhysicalPath, newPhysicalPath);
      }
      await prisma.audioFile.update({
        where: { id: f.id },
        data: { folderId: null, path: \`/uploads/\${fileName}\` }
      });
    }
    
    // Delete physical folder
    if (fs.existsSync(folderPath)) {
      try { fs.rmdirSync(folderPath); } catch (e) {} // might fail if not empty (e.g. non-DB files inside)
    }
    
    await prisma.folder.delete({ where: { id: folderId } });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi xóa thư mục' });
  }
});`;
code = code.replace(delFolderRegex, newDelFolder);

const moveFileRegex = /\/\/ PUT \/api\/files\/:id\/move - move a file to a folder[\s\S]*?\}\);/g;
const newMoveFile = `// PUT /api/files/:id/move - move a file to a folder
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
    
    const fileName = path.basename(file.path);
    const oldPhysicalPath = path.join(__dirname, '../../', decodeURIComponent(file.path));
    const newPhysicalPath = targetFolder 
      ? path.join(UPLOADS_DIR, targetFolder.name, fileName)
      : path.join(UPLOADS_DIR, fileName);
      
    // Create target dir if needed
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
        path: targetFolder ? \`/uploads/\${encodeURIComponent(targetFolder.name)}/\${encodeURIComponent(fileName)}\` : \`/uploads/\${encodeURIComponent(fileName)}\`
      }
    });
    res.json(updatedFile);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Lỗi di chuyển file' });
  }
});`;
code = code.replace(moveFileRegex, newMoveFile);

// upload logic fix
const uploadRegex = /\/\/ POST \/api\/files\/upload - upload audio files[\s\S]*?res\.json\(\{ success: true, files: results \}\);\s*\}\s*catch\s*\(err\)\s*\{\s*console\.error\('Upload error:', err\);\s*res\.status\(500\)\.json\(\{ error: '.*?mAy ch ' \}\);\s*\}\s*\}\);/g;
const newUpload = `// POST /api/files/upload - upload audio files
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
      
      let finalPath = \`/uploads/\${encodeURIComponent(file.filename)}\`;
      if (targetFolder) {
        const oldPhysicalPath = path.join(UPLOADS_DIR, file.filename);
        const newPhysicalPath = path.join(UPLOADS_DIR, targetFolder.name, file.filename);
        if (fs.existsSync(oldPhysicalPath)) {
          fs.renameSync(oldPhysicalPath, newPhysicalPath);
        }
        finalPath = \`/uploads/\${encodeURIComponent(targetFolder.name)}/\${encodeURIComponent(file.filename)}\`;
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
});`;
code = code.replace(uploadRegex, newUpload);


fs.writeFileSync('backend/src/routes/files.ts', code, 'utf8');