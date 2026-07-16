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
    await prisma.device.delete({
      where: { id: req.params.id }
    });
    
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
    
    if (io) io.emit('DEVICES_UPDATED');
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
