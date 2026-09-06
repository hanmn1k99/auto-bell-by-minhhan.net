const fs = require('fs');
let code = fs.readFileSync('backend/src/routes/files.ts', 'utf8');

const folderRoutes = \// GET /api/files/folders - list all folders
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
    const folder = await prisma.folder.create({ data: { name: name.trim() } });
    res.json(folder);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create folder' });
  }
});

// PUT /api/files/folders/:id - update a folder
router.put('/folders/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (!name || name.trim() === '') return res.status(400).json({ error: 'Tên thư mục không hợp lệ' });
    const folder = await prisma.folder.update({
      where: { id: Number(req.params.id) },
      data: { name: name.trim() }
    });
    res.json(folder);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update folder' });
  }
});

// DELETE /api/files/folders/:id - delete a folder
router.delete('/folders/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    await prisma.folder.delete({ where: { id: Number(req.params.id) } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete folder' });
  }
});

// PUT /api/files/:id/move - move a file to a folder
router.put('/:id/move', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { folderId } = req.body; // can be null
    const file = await prisma.audioFile.update({
      where: { id: Number(req.params.id) },
      data: { folderId: folderId || null }
    });
    res.json(file);
  } catch (err) {
    res.status(500).json({ error: 'Failed to move file' });
  }
});\n\n\;

code = code.replace('// GET /api/files - list all audio files', folderRoutes + '// GET /api/files - list all audio files');
fs.writeFileSync('backend/src/routes/files.ts', code, 'utf8');