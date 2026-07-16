import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';
import { getSocketIo } from '../index'; 
import { getCurrentState } from '../scheduler';

const router = express.Router();
const prisma = new PrismaClient();

// Lấy danh sách thiết bị
router.get('/', authenticateToken, async (req, res) => {
  try {
    const devices = await prisma.device.findMany({
      orderBy: { lastSeen: 'desc' },
    });
    
    // Đánh dấu thiết bị nào đang online
    const io = getSocketIo();
    const onlineDeviceIds = new Set();
    
    if (io) {
      // Tìm trong các socket connected
      const sockets = await io.fetchSockets();
      for (const socket of sockets) {
        if (socket.data && socket.data.deviceId) {
          onlineDeviceIds.add(socket.data.deviceId);
        }
      }
    }
    
    const devicesWithOnlineStatus = devices.map(d => ({
      ...d,
      isOnline: onlineDeviceIds.has(d.id)
    }));

    res.json(devicesWithOnlineStatus);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Phê duyệt / Cập nhật thiết bị
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { isApproved, name } = req.body;
    const device = await prisma.device.update({
      where: { id: req.params.id },
      data: { 
        ...(isApproved !== undefined && { isApproved }),
        ...(name !== undefined && { name })
      }
    });

    // Nếu thiết bị được duyệt, reset fingerprint để không bị khóa oan
    if (device.isApproved && device.ipAddress && device.browserInfo) {
      await prisma.deviceFingerprint.updateMany({
        where: { ipAddress: device.ipAddress, browserInfo: device.browserInfo },
        data: { rejectCount: 0, blockLevel: 0, blockedUntil: null }
      });
    }
    
    const io = getSocketIo();
    if (io) {
      // Tìm socket của thiết bị này và gửi update status
      const sockets = await io.fetchSockets();
      for (const socket of sockets) {
        if (socket.data && socket.data.deviceId === device.id) {
          socket.data.isApproved = device.isApproved;
          socket.emit('DEVICE_STATUS', { isApproved: device.isApproved });
          
          if (device.isApproved) {
            // Gửi state mới nhất
            const state = getCurrentState();
            if (state.tracks.length > 0) {
              const idx = Math.min(state.trackIndex, state.tracks.length - 1);
              socket.emit('SYNC_STATE', { 
                currentTrack: state.tracks[idx],
                volume: state.playlistVolume ?? state.volume,
                isOverride: state.playlistVolume !== null,
                targetTime: state.targetTime,
                status: state.status,
                pauseOffset: state.pauseOffset,
                upNext: state.tracks.slice(idx + 1)
              });
            } else {
              socket.emit('SYNC_STATE', { currentTrack: null, status: 'stopped', upNext: [] });
            }
          } else {
            // Ngừng phát
            socket.leave('approved');
            socket.emit('SYNC_STATE', { currentTrack: null, status: 'stopped', upNext: [] });
          }
        }
      }
    }
    
    if (io) io.emit('DEVICES_UPDATED');
    res.json(device);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Xóa thiết bị
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const device = await prisma.device.findUnique({
      where: { id: req.params.id }
    });
    
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    await prisma.device.delete({
      where: { id: req.params.id }
    });
    
    let fingerprint = null;
    const io = getSocketIo();
    if (io) {
      // Gửi lệnh chưa phê duyệt/ngắt cho các socket thuộc device này
      const sockets = await io.fetchSockets();
      for (const socket of sockets) {
        if (socket.data && socket.data.deviceId === req.params.id) {
          socket.leave('approved');
          socket.data.isApproved = false;
          socket.emit('DEVICE_DELETED');
        }
      }
    }

    if (device.ipAddress && device.browserInfo) {
      const existingFp = await prisma.deviceFingerprint.findUnique({
        where: { ipAddress_browserInfo: { ipAddress: device.ipAddress, browserInfo: device.browserInfo } }
      });
      if (existingFp) {
        const newRejectCount = existingFp.rejectCount + 1;
        let newBlockLevel = existingFp.blockLevel;
        let newBlockedUntil = existingFp.blockedUntil;

        if (newBlockLevel === 0 && newRejectCount >= 10) {
          newBlockedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
          newBlockLevel = 1;
        } else if (newBlockLevel >= 1 && newRejectCount >= 3) {
          newBlockedUntil = new Date(Date.now() + 48 * 60 * 60 * 1000);
          newBlockLevel = 2; // Keep at 2 or increment
        }

        await prisma.deviceFingerprint.update({
          where: { id: existingFp.id },
          data: {
            rejectCount: (newBlockLevel > existingFp.blockLevel) ? 0 : newRejectCount,
            blockLevel: newBlockLevel,
            blockedUntil: newBlockedUntil
          }
        });
      } else {
        await prisma.deviceFingerprint.create({
          data: {
            ipAddress: device.ipAddress,
            browserInfo: device.browserInfo,
            rejectCount: 1
          }
        });
      }
    }
    
    if (io) io.emit('DEVICES_UPDATED');
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
