const fs = require('fs');
let code = fs.readFileSync('backend/src/routes/playlists.ts', 'utf8');

const startIdx = code.indexOf('// POST /api/playlists/:id/items - add audio file to playlist');
const endIdx = code.indexOf('// PUT /api/playlists/:id/items/reorder - reorder playlist items');

const before = code.substring(0, startIdx);
const after = code.substring(endIdx);

const replacement = `// POST /api/playlists/:id/items - add audio file to playlist
router.post('/:id/items', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { audioFileId, audioFileIds } = req.body;
    const playlistId = Number(req.params.id);

    let count = await prisma.playlistItem.count({ where: { playlistId } });
    
    // Support bulk add
    if (audioFileIds && Array.isArray(audioFileIds)) {
      const existingItems = await prisma.playlistItem.findMany({ where: { playlistId } });
      const existingAudioIds = new Set(existingItems.map(item => item.audioFileId));
      
      const toAdd = audioFileIds.filter(id => !existingAudioIds.has(Number(id)));
      if (toAdd.length === 0) {
        return res.json({ message: 'No new items to add' });
      }
      
      const newItems = toAdd.map((id, idx) => ({
        playlistId,
        audioFileId: Number(id),
        order: count + idx
      }));
      
      await prisma.playlistItem.createMany({ data: newItems });
      res.status(201).json({ added: newItems.length });
    } else {
      // Single add
      const item = await prisma.playlistItem.create({
        data: { playlistId, audioFileId: Number(audioFileId), order: count },
        include: { audioFile: true },
      });
      res.status(201).json(item);
    }
    
    reloadScheduleCache().catch(() => {});
  } catch (err) {
    res.status(500).json({ error: 'Failed to add item(s)' });
  }
});

`;

code = before + replacement + after;
fs.writeFileSync('backend/src/routes/playlists.ts', code, 'utf8');