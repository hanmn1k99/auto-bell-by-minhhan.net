import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import { authenticateToken } from '../middleware/auth';
import { reloadScheduleCache } from '../scheduler';

const router = Router();

// GET /api/playlists
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const playlists = await prisma.playlist.findMany({
      include: {
        items: { include: { audioFile: true }, orderBy: { order: 'asc' } },
        _count: { select: { items: true } },
      },
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    });
    res.json(playlists);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get playlists' });
  }
});

// POST /api/playlists/reorder
router.post('/reorder', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderIds } = req.body;
    if (!Array.isArray(orderIds)) { res.status(400).json({ error: 'Invalid data' }); return; }
    
    // Process sequentially to update order
    for (let i = 0; i < orderIds.length; i++) {
      await prisma.playlist.update({
        where: { id: Number(orderIds[i]) },
        data: { order: i }
      });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reorder' });
  }
});

// GET /api/playlists/:id
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const playlist = await prisma.playlist.findUnique({
      where: { id: Number(req.params.id) },
      include: { items: { include: { audioFile: true }, orderBy: { order: 'asc' } } },
    });
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });
    reloadScheduleCache().catch(() => {});
    res.json(playlist);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get playlist' });
  }
});

// POST /api/playlists
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { name, description, volume, isLoop } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const playlist = await prisma.playlist.create({
      data: {
        name,
        description,
        volume: typeof volume === 'number' ? volume : 1.0,
        isLoop: typeof isLoop === 'boolean' ? isLoop : true,
      },
    });
    res.status(201).json(playlist);
    reloadScheduleCache().catch(() => {});
  } catch (err) {
    res.status(500).json({ error: 'Failed to create playlist' });
  }
});

// PUT /api/playlists/:id
router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { name, description, volume, isLoop } = req.body;
    const playlist = await prisma.playlist.update({
      where: { id: Number(req.params.id) },
      data: {
        name,
        description,
        volume: typeof volume === 'number' ? volume : undefined,
        isLoop: typeof isLoop === 'boolean' ? isLoop : undefined,
      },
    });
    res.json(playlist);
    reloadScheduleCache().catch(() => {});
  } catch (err) {
    res.status(500).json({ error: 'Failed to update playlist' });
  }
});

// DELETE /api/playlists/:id
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    await prisma.playlist.delete({ where: { id: Number(req.params.id) } });
    res.json({ success: true });
    reloadScheduleCache().catch(() => {});
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete playlist' });
  }
});

// PUT /api/playlists/:id/items/bulk - replace entire playlist items
router.put('/:id/items/bulk', authenticateToken, async (req: Request, res: Response) => {
  try {
    const playlistId = Number(req.params.id);
    const { audioFileIds } = req.body; // array of number
    
    if (!Array.isArray(audioFileIds)) {
      return res.status(400).json({ error: 'audioFileIds must be an array' });
    }

    // Wrap in a transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      // 1. Delete all existing items
      await tx.playlistItem.deleteMany({ where: { playlistId } });
      
      // 2. Create new items in order
      if (audioFileIds.length > 0) {
        await tx.playlistItem.createMany({
          data: audioFileIds.map((fileId: number, index: number) => ({
            playlistId,
            audioFileId: Number(fileId),
            order: index
          }))
        });
      }
    });

    res.json({ success: true });
    reloadScheduleCache().catch(() => {});
  } catch (err) {
    res.status(500).json({ error: 'Failed to bulk replace items' });
  }
});

// POST /api/playlists/:id/items - add audio file to playlist
router.post('/:id/items', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { audioFileId } = req.body;
    const playlistId = Number(req.params.id);

    const count = await prisma.playlistItem.count({ where: { playlistId } });
    const item = await prisma.playlistItem.create({
      data: { playlistId, audioFileId: Number(audioFileId), order: count },
      include: { audioFile: true },
    });
    res.status(201).json(item);
    reloadScheduleCache().catch(() => {});
  } catch (err) {
    res.status(500).json({ error: 'Failed to add item' });
  }
});

// PUT /api/playlists/:id/items/reorder - reorder playlist items
router.put('/:id/items/reorder', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { items } = req.body; // array of { id, order }
    await Promise.all(
      items.map((item: { id: number; order: number }) =>
        prisma.playlistItem.update({ where: { id: item.id }, data: { order: item.order } })
      )
    );
    res.json({ success: true });
    reloadScheduleCache().catch(() => {});
  } catch (err) {
    res.status(500).json({ error: 'Failed to reorder' });
  }
});

// DELETE /api/playlists/:id/items/:itemId
router.delete('/:id/items/:itemId', authenticateToken, async (req: Request, res: Response) => {
  try {
    await prisma.playlistItem.delete({ where: { id: Number(req.params.itemId) } });
    res.json({ success: true });
    reloadScheduleCache().catch(() => {});
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove item' });
  }
});

export default router;
