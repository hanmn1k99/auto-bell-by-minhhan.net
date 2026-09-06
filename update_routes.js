const fs = require('fs');
let code = fs.readFileSync('backend/src/routes/files.ts', 'utf8');

// 1. Update GET /folders
code = code.replace(
    /prisma\.folder\.findMany\(\{\s*orderBy:\s*\{\s*name:\s*'asc'\s*\}\s*\}\)/g,
    "prisma.folder.findMany({ orderBy: [{ order: 'asc' }, { name: 'asc' }] })"
);

// 2. Update GET /
code = code.replace(
    /prisma\.audioFile\.findMany\(\{\s*orderBy:\s*\{\s*name:\s*'asc'\s*\}\s*\}\)/g,
    "prisma.audioFile.findMany({ orderBy: [{ order: 'asc' }, { name: 'asc' }] })"
);

// 3. Add POST /reorder and /folders/reorder
const reorderRoutes = `
  // PUT /api/files/folders/reorder
  router.put('/folders/reorder', authenticateToken, async (req: Request, res: Response) => {
    try {
      const { orderedIds } = req.body;
      if (!Array.isArray(orderedIds)) return res.status(400).json({ error: 'Invalid data' });
      for (let i = 0; i < orderedIds.length; i++) {
        await prisma.folder.update({ where: { id: orderedIds[i] }, data: { order: i } }).catch(() => null);
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to reorder folders' });
    }
  });

  // PUT /api/files/reorder
  router.put('/reorder', authenticateToken, async (req: Request, res: Response) => {
    try {
      const { orderedIds } = req.body;
      if (!Array.isArray(orderedIds)) return res.status(400).json({ error: 'Invalid data' });
      for (let i = 0; i < orderedIds.length; i++) {
        await prisma.audioFile.update({ where: { id: orderedIds[i] }, data: { order: i } }).catch(() => null);
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to reorder files' });
    }
  });
`;

if (!code.includes('/folders/reorder')) {
    code = code.replace(
        "export default router;",
        reorderRoutes + "\nexport default router;"
    );
}

fs.writeFileSync('backend/src/routes/files.ts', code, 'utf8');
console.log("Done");