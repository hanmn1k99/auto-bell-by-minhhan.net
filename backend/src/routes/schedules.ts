import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import { reloadScheduleCache } from '../scheduler';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// GET /api/schedules
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const schedules = await prisma.schedule.findMany({
      include: {
        playlist: {
          include: { items: { include: { audioFile: true }, orderBy: { order: 'asc' } } },
        },
      },
      orderBy: [
        { order: 'asc' },
        { id: 'asc' }
      ],
    });
    res.json(schedules);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch schedules' });
  }
});

// POST /api/schedules/reorder
router.post('/reorder', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { orderIds } = req.body;
    if (!Array.isArray(orderIds)) return res.status(400).json({ error: 'Invalid data' });
    
    // Process reorder in a transaction
    await prisma.$transaction(
      orderIds.map((id: number, index: number) => 
        prisma.schedule.update({
          where: { id },
          data: { order: index }
        })
      )
    );
    
    res.json({ success: true });
    reloadScheduleCache().catch(() => {});
  } catch (err) {
    res.status(500).json({ error: 'Failed to reorder' });
  }
});

// POST /api/schedules
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { name, startTime, endTime, daysOfWeek: rawDaysOfWeek, isActive } = req.body;
    const daysOfWeek = Array.isArray(rawDaysOfWeek) ? rawDaysOfWeek.join(",") : (rawDaysOfWeek ? String(rawDaysOfWeek) : undefined);
    if (!name || !startTime || !endTime || !daysOfWeek) {
      return res.status(400).json({ error: 'All fields required' });
    }

    const playlist = await prisma.playlist.create({
      data: {
        name: name,
        volume: 1.0
      }
    });

    const schedule = await prisma.schedule.create({
      data: { name, startTime, endTime, playlistId: playlist.id, daysOfWeek, isActive: isActive ?? true },
      include: { playlist: true },
    });
    res.status(201).json(schedule);
    reloadScheduleCache().catch(() => {});
  } catch (err) {
    res.status(500).json({ error: 'Failed to create schedule' });
  }
});

// POST /api/schedules/:id/duplicate
router.post('/:id/duplicate', authenticateToken, async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const originalSch = await prisma.schedule.findUnique({
      where: { id },
      include: {
        playlist: {
          include: {
            items: true
          }
        }
      }
    });

    if (!originalSch) return res.status(404).json({ error: 'Not found' });

    // Dupe playlist
    const newPlaylist = await prisma.playlist.create({
      data: {
        name: `${originalSch.playlist.name} (Copy)`,
        volume: originalSch.playlist.volume,
        isLoop: originalSch.playlist.isLoop,
        order: originalSch.playlist.order
      }
    });

    // Dupe playlist items
    if (originalSch.playlist.items.length > 0) {
      await prisma.playlistItem.createMany({
        data: originalSch.playlist.items.map(item => ({
          playlistId: newPlaylist.id,
          audioFileId: item.audioFileId,
          order: item.order
        }))
      });
    }

    // Dupe schedule
    const newSch = await prisma.schedule.create({
      data: {
        name: `${originalSch.name} (Copy)`,
        startTime: originalSch.startTime,
        endTime: originalSch.endTime,
        daysOfWeek: originalSch.daysOfWeek,
        isActive: false, // Turn off by default to avoid overlapping
        targetDevices: originalSch.targetDevices,
        soundCardId: originalSch.soundCardId,
        playlistId: newPlaylist.id
      },
      include: { playlist: { include: { items: { include: { audioFile: true } } } } }
    });

    res.status(201).json(newSch);
    reloadScheduleCache().catch(() => {});
  } catch (err) {
    res.status(500).json({ error: 'Failed to duplicate' });
  }
});

// PUT /api/schedules/:id
router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { name, startTime, endTime, playlistId, daysOfWeek: rawDaysOfWeek, isActive } = req.body;
    const daysOfWeek = Array.isArray(rawDaysOfWeek) ? rawDaysOfWeek.join(",") : (rawDaysOfWeek ? String(rawDaysOfWeek) : undefined);
    const schedule = await prisma.schedule.update({
      where: { id: Number(req.params.id) },
      data: { name, startTime, endTime, playlistId: Number(playlistId), daysOfWeek, isActive },
      include: { playlist: true },
    });
    
    // Also rename the associated playlist if schedule name changed
    if (name && schedule.playlistId) {
      await prisma.playlist.update({
        where: { id: schedule.playlistId },
        data: { name: name }
      });
    }

    res.json(schedule);
    reloadScheduleCache().catch(() => {});
  } catch (err) {
    res.status(500).json({ error: 'Failed to update schedule' });
  }
});

// DELETE /api/schedules/:id
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const sch = await prisma.schedule.findUnique({ where: { id: Number(req.params.id) } });
    if (sch) {
      // Deleting the playlist will cascade and delete the schedule and playlist items
      await prisma.playlist.delete({ where: { id: sch.playlistId } });
    }
    res.json({ success: true });
    reloadScheduleCache().catch(() => {});
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete schedule' });
  }
});

export default router;
