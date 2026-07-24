import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import UAParser from 'ua-parser-js';

dotenv.config();

import authRoutes from './routes/auth';
import fileRoutes from './routes/files';
import playlistRoutes from './routes/playlists';
import scheduleRoutes from './routes/schedules';
import { startScheduler, playNextTrack, playPrevTrack, pausePlayback, resumePlayback, seekPlayback, stopPlayback, getCurrentState, playManualFile, playManualPlaylist, queueManualFile, queueManualPlaylist, getGlobalVolume, setGlobalVolume, handleTrackEnded, getGlobalFadeInDuration, setGlobalFadeInDuration } from './scheduler';
import { authenticateToken, authorizeAdmin } from './middleware/auth';
import setupRoutes from './routes/setup';
import userRoutes from './routes/users';
import departmentRoutes from './routes/departments';
import bellRoutes from './routes/bells';
import periodRoutes from './routes/periods';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

const PORT = process.env.PORT || 3001;

// Directories
const UPLOADS_DIR = path.join(process.cwd(), '..', 'uploads');
const ASSETS_DIR = path.join(process.cwd(), '..', 'assets');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });
fs.mkdirSync(ASSETS_DIR, { recursive: true });

// Middleware
app.use(cors());
app.use(express.json());

// Static files
app.use('/uploads', express.static(UPLOADS_DIR));
app.use('/assets', express.static(ASSETS_DIR));

import deviceRoutes from './routes/devices';

// Routes
app.use('/api/setup', setupRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/devices', authenticateToken, authorizeAdmin, deviceRoutes);
app.use('/api/users', authenticateToken, authorizeAdmin, userRoutes);
app.use('/api/departments', authenticateToken, departmentRoutes);
app.use('/api/bells', authenticateToken, bellRoutes);
app.use('/api/periods', authenticateToken, periodRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

export const getSocketIo = () => io;


// Admin controls
app.post('/api/admin/next', authenticateToken, (req, res) => {
  playNextTrack(io);
  res.json({ success: true });
});

app.post('/api/admin/prev', authenticateToken, (req, res) => {
  playPrevTrack(io);
  res.json({ success: true });
});

app.post('/api/admin/pause', authenticateToken, (req, res) => {
  pausePlayback(io);
  res.json({ success: true });
});

app.post('/api/admin/resume', authenticateToken, (req, res) => {
  resumePlayback(io);
  res.json({ success: true });
});

app.post('/api/admin/seek', authenticateToken, (req, res) => {
  if (typeof req.body.time === 'number') {
    seekPlayback(io, req.body.time);
  }
  res.json({ success: true });
});

app.post('/api/admin/stop', authenticateToken, (req, res) => {
  stopPlayback(io);
  res.json({ success: true });
});

app.get('/api/admin/state', authenticateToken, (req, res) => {
  res.json(getCurrentState());
});

app.post('/api/admin/volume', authenticateToken, (req, res) => {
  const { volume } = req.body;
  if (typeof volume === 'number') {
    setGlobalVolume(io, volume);
  }
  res.json({ success: true, volume: getGlobalVolume() });
});

app.post('/api/admin/test-sound-card', authenticateToken, async (req, res) => {
  try {
    const { soundCardId } = req.body;
    const sampleAudio = await prisma.audioFile.findFirst();
    if (!sampleAudio) {
      return res.status(400).json({ error: 'Chưa có tệp âm thanh nào trong hệ thống để phát thử' });
    }
    io.emit('PLAY_BELL', {
      url: sampleAudio.path,
      name: `Phát thử nghiệm (${soundCardId === 'card-1' ? 'Card 1 / Kênh Trái' : soundCardId === 'card-2' ? 'Card 2 / Kênh Phải' : soundCardId === 'all' ? 'Toàn hệ thống' : 'Card mặc định'})`,
      soundCardId: soundCardId || 'default',
      volume: 1,
      fadeInDuration: 0,
      targetTime: Date.now() + 500
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/play-file/:id', authenticateToken, async (req, res) => {
  try {
    await playManualFile(io, Number(req.params.id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/admin/play-playlist/:id', authenticateToken, async (req, res) => {
  try {
    await playManualPlaylist(io, Number(req.params.id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/admin/queue-file/:id', authenticateToken, async (req, res) => {
  try {
    await queueManualFile(io, Number(req.params.id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/admin/queue-playlist/:id', authenticateToken, async (req, res) => {
  try {
    await queueManualPlaylist(io, Number(req.params.id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Socket.IO
io.on('connection', async (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);
  
  // Kiểm tra token admin
  let isAdmin = false;
  try {
    const token = socket.handshake.auth?.token;
    if (token) {
      jwt.verify(token, process.env.JWT_SECRET || 'super_secret_jwt_key_123');
      isAdmin = true;
    }
  } catch (e) {}
  
  socket.data.isAdmin = isAdmin;

  io.emit('ONLINE_CLIENTS', io.engine.clientsCount);
  
  // Gửi state luôn nếu là Admin
  if (isAdmin) {
    socket.join('approved'); // Admin tự động join room approved
    const state = getCurrentState();
    if (state.tracks.length > 0) {
      const idx = Math.min(state.trackIndex, state.tracks.length - 1);
      socket.emit('SYNC_STATE', { 
        currentTrack: state.tracks[idx],
        volume: state.playlistVolume ?? state.volume,
        fadeInDuration: getGlobalFadeInDuration(),
        isOverride: state.playlistVolume !== null,
        targetTime: state.targetTime,
        status: state.status,
        pauseOffset: state.pauseOffset,
        upNext: state.tracks.slice(idx + 1)
      });
    } else {
      socket.emit('SYNC_STATE', { currentTrack: null, status: 'stopped', upNext: [] });
    }
    
    socket.on('SET_VOLUME', (vol: number) => {
      setGlobalVolume(io, vol);
    });

    socket.on('SET_FADE_IN', (dur: number) => {
      setGlobalFadeInDuration(io, dur);
    });
  }

  socket.emit('SET_VOLUME', { volume: getGlobalVolume() });
  socket.emit('SET_FADE_IN', { fadeInDuration: getGlobalFadeInDuration() });

  socket.on('REGISTER_DEVICE', async (data: { deviceId: string; name?: string }) => {
    console.log(`[Socket] Received REGISTER_DEVICE from ${socket.id}:`, data);
    if (isAdmin) return;
    const { deviceId, name } = data;
    if (!deviceId) return;

    try {
      let device = await prisma.device.findUnique({ where: { id: deviceId } });
      let ipRaw = socket.handshake.headers['cf-connecting-ip'] || socket.handshake.headers['x-forwarded-for'] || socket.handshake.address || '';
      if (Array.isArray(ipRaw)) ipRaw = ipRaw[0];
      let ip = ipRaw.split(',')[0].trim();
      if (ip.startsWith('::ffff:')) ip = ip.replace('::ffff:', '');
      
      const uaString = socket.handshake.headers['user-agent'] || '';
      const parser = new (UAParser as any)(uaString);
      const browser = parser.getBrowser();
      const os = parser.getOS();
      const browserInfo = browser.name ? `${browser.name} ${browser.version} trên ${os.name}` : 'Không rõ';

      const fingerprint = await prisma.deviceFingerprint.findUnique({
        where: { ipAddress_browserInfo: { ipAddress: ip, browserInfo } }
      });
      if (fingerprint && fingerprint.blockedUntil && fingerprint.blockedUntil > new Date()) {
        socket.emit('DEVICE_BLOCKED', { blockedUntil: fingerprint.blockedUntil });
        return;
      }

      if (!device) {
        device = await prisma.device.create({
          data: { id: deviceId, name: name || 'Thiết bị mới', ipAddress: ip, browserInfo }
        });
      } else {
        device = await prisma.device.update({
          where: { id: deviceId },
          data: { lastSeen: new Date(), ipAddress: ip, browserInfo }
        });
      }

      socket.data.deviceId = deviceId;
      socket.data.isApproved = device.isApproved;

      socket.emit('DEVICE_STATUS', { isApproved: device.isApproved });

      if (device.isApproved) {
        socket.join('approved');
        const state = getCurrentState();
        if (state.tracks.length > 0) {
          const idx = Math.min(state.trackIndex, state.tracks.length - 1);
          socket.emit('SYNC_STATE', { 
            currentTrack: state.tracks[idx],
            volume: state.playlistVolume ?? state.volume,
            fadeInDuration: getGlobalFadeInDuration(),
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
        socket.leave('approved');
      }

      io.emit('DEVICES_UPDATED');
    } catch (err) {
      console.error('[Socket] Device registration error:', err);
    }
  });

  socket.on('PING_TIME', (clientTime: number) => {
    socket.emit('PONG_TIME', { clientTime, serverTime: Date.now() });
  });

  socket.on('TRACK_ENDED', () => {
    // Chỉ chấp nhận nếu là client được duyệt hoặc admin
    if (socket.data.isAdmin || socket.data.isApproved) {
      handleTrackEnded(io);
    }
  });

  const emitOnlineClients = () => {
    let count = 0;
    for (const [id, s] of io.sockets.sockets) {
      if (!s.data.isAdmin) count++;
    }
    io.emit('ONLINE_CLIENTS', count);
  };

  io.emit('ONLINE_CLIENTS', io.engine.clientsCount); // fallback
  emitOnlineClients();

  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
    emitOnlineClients();
  });
});


// Start scheduler
startScheduler(io);

// Serve Frontend Static Files
const FRONTEND_DIST = path.join(process.cwd(), '..', 'frontend', 'dist');
if (fs.existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST, { index: false }));
  app.use((req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
  });
} else {
  console.warn(`[Warn] Frontend dist not found at ${FRONTEND_DIST}. Please build frontend first.`);
}

// Seed database on startup
import('./seed').catch(() => {});

httpServer.listen(PORT, () => {
  console.log(`\n🔔 AutoBells Backend running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health\n`);
});
