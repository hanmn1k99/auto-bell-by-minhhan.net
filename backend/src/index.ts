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
import { startScheduler, reloadScheduleCache, playNextTrack, playPrevTrack, pausePlayback, resumePlayback, seekPlayback, stopPlayback, getCurrentState, playManualFile, playManualPlaylist, queueManualFile, queueManualPlaylist, getGlobalVolume, setGlobalVolume, handleTrackEnded, getGlobalFadeInDuration, setGlobalFadeInDuration, setYoutubeState, currentYoutubeState, broadcastState } from './scheduler';
import { authenticateToken, authorizeAdmin } from './middleware/auth';
import setupRoutes from './routes/setup';
import userRoutes from './routes/users';
import departmentRoutes from './routes/departments';
import bellRoutes from './routes/bells';
import periodRoutes from './routes/periods';

const app = express();
const httpServer = createServer(app);
export const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

const PORT = process.env.PORT || 3001;

// ====== IN-MEMORY DEVICE CACHE ======
// Lưu trạng thái thiết bị trong RAM để tránh spam DB mỗi khi thiết bị kết nối lại
export const deviceCache = new Map<string, { isApproved: boolean; lastWritten: number }>();
// =====================================

// Directories
const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');
const ASSETS_DIR = path.join(__dirname, '..', '..', 'assets');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });
fs.mkdirSync(ASSETS_DIR, { recursive: true });

// Middleware
app.use(cors());
app.use(express.json({ limit: '100mb' }));

// Ngăn chặn Cloudflare hoặc Browser cache các request API
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

// Static files
app.use('/uploads', express.static(UPLOADS_DIR));
app.use('/assets', express.static(ASSETS_DIR));
app.use('/api/uploads', express.static(UPLOADS_DIR));
app.use('/api/assets', express.static(ASSETS_DIR));

import deviceRoutes from './routes/devices';

import youtubeRoutes from './routes/youtube';

// Routes
app.set('io', io);
app.use('/api/setup', setupRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/youtube', youtubeRoutes);
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
  io.emit('PAUSE_YOUTUBE_VIDEO');
  if (currentYoutubeState) { setYoutubeState({ ...currentYoutubeState, status: 'paused' }); broadcastState(io); }
  res.json({ success: true });
});

app.post('/api/admin/resume', authenticateToken, (req, res) => {
  resumePlayback(io);
  io.emit('RESUME_YOUTUBE_VIDEO');
  if (currentYoutubeState) { setYoutubeState({ ...currentYoutubeState, status: 'playing' }); broadcastState(io); }
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
  io.emit('STOP_YOUTUBE_VIDEO');
  setYoutubeState(null);
  broadcastState(io);
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

// Khai báo bộ nhớ lưu trữ danh sách card âm thanh của các thiết bị Player
const connectedSoundCards = new Map<string, { deviceId: string, deviceName: string, cards: { deviceId: string, label: string }[] }>();

// Gửi state hiện tại cho 1 socket cụ thể (không broadcast toàn room)
function emitStateToSocket(socket: any) {
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
      upNext: state.tracks.slice(idx + 1),
      youtubeState: currentYoutubeState
    });
  } else {
    socket.emit('SYNC_STATE', { currentTrack: null, status: 'stopped', upNext: [], youtubeState: currentYoutubeState });
  }
}

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
    emitStateToSocket(socket); // Gửi đầy đủ state (âm thanh + youtube) cho Admin này
    
    socket.on('SET_VOLUME', (vol: number) => {
      setGlobalVolume(io, vol);
    });

    socket.on('SET_FADE_IN', (dur: number) => {
      setGlobalFadeInDuration(io, dur);
    });

    // Admin vừa kết nối, gửi danh sách sound cards hiện tại cho họ
    socket.emit('AVAILABLE_SOUND_CARDS', Array.from(connectedSoundCards.values()));
  }

  socket.emit('SET_VOLUME', { volume: getGlobalVolume() });
  socket.emit('SET_FADE_IN', { fadeInDuration: getGlobalFadeInDuration() });

  // Debounce DEVICES_UPDATED: gom nhiều sự kiện lại → chỉ broadcast 1 lần sau 600ms yên tĩnh
  let devicesUpdatedTimeout: NodeJS.Timeout | null = null;
  const debouncedDevicesUpdated = () => {
    if (devicesUpdatedTimeout) clearTimeout(devicesUpdatedTimeout);
    devicesUpdatedTimeout = setTimeout(() => {
      io.emit('DEVICES_UPDATED');
    }, 600);
  };

  socket.on('REGISTER_DEVICE', async (data: { deviceId: string; name?: string; wanIp?: string }) => {
    if (isAdmin) return;
    const { deviceId, name, wanIp } = data;
    if (!deviceId) return;

    try {
      // ⚡ BƯỚC 1: Kiểm tra RAM cache trước, tránh đập thẳng vào DB ⚡
      const cached = deviceCache.get(deviceId);
      const now = Date.now();

      // Phân tích IP & Browser (không cần DB)
      let ipRaw = socket.handshake.headers['cf-connecting-ip'] || socket.handshake.headers['x-forwarded-for'] || socket.handshake.address || '';
      if (Array.isArray(ipRaw)) ipRaw = ipRaw[0];
      let ip = wanIp || ipRaw.split(',')[0].trim();
      if (ip.startsWith('::ffff:')) ip = ip.replace('::ffff:', '');
      const uaString = socket.handshake.headers['user-agent'] || '';
      const parser = new (UAParser as any)(uaString);
      const browser = parser.getBrowser();
      const os = parser.getOS();
      const browserInfo = browser.name ? `${browser.name} ${browser.version} trên ${os.name}` : 'Không rõ';

      // Nếu có cache còn tươi (< 60s), dùng ngay không cần DB
      if (cached && (now - cached.lastWritten) < 60000) {
        socket.data.deviceId = deviceId;
        socket.data.isApproved = cached.isApproved;
        socket.emit('DEVICE_STATUS', { isApproved: cached.isApproved });
        if (cached.isApproved) {
          socket.join('approved');
          emitStateToSocket(socket);
        } else {
          socket.leave('approved');
        }
        // Cập nhật lastSeen trong DB không đồng bộ (fire-and-forget, không block)
        prisma.device.update({ where: { id: deviceId }, data: { lastSeen: new Date() } }).catch(() => {});
        return;
      }

      // ── BƯỚC 2: Lần đầu kết nối hoặc cache hết hạn → đọc DB ──
      const [device, fingerprint] = await Promise.all([
        prisma.device.findUnique({ where: { id: deviceId } }),
        prisma.deviceFingerprint.findUnique({ where: { ipAddress_browserInfo: { ipAddress: ip, browserInfo } } })
      ]);

      if (fingerprint && fingerprint.blockedUntil && fingerprint.blockedUntil > new Date()) {
        socket.emit('DEVICE_BLOCKED', { blockedUntil: fingerprint.blockedUntil });
        return;
      }

      let finalDevice: { id: string; isApproved: boolean } | null = device;
      if (!device) {
        finalDevice = await prisma.device.create({
          data: { id: deviceId, name: name || 'Thiết bị mới', ipAddress: ip, browserInfo }
        });
        // Thiết bị mới → cần broadcast để Admin biết
        debouncedDevicesUpdated();
      } else {
        // Chỉ cập nhật DB không đồng bộ (fire-and-forget)
        prisma.device.update({ where: { id: deviceId }, data: { lastSeen: new Date(), ipAddress: ip, browserInfo } }).catch(() => {});
      }

      const isApproved = finalDevice?.isApproved ?? false;

      // Lưu vào RAM cache
      deviceCache.set(deviceId, { isApproved, lastWritten: now });

      socket.data.deviceId = deviceId;
      socket.data.isApproved = isApproved;
      socket.emit('DEVICE_STATUS', { isApproved });

      if (isApproved) {
        socket.join('approved');
        emitStateToSocket(socket);
      } else {
        socket.leave('approved');
      }

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

  socket.on('REPORT_SOUND_CARDS', async (data: { deviceId: string, cards: { deviceId: string, label: string }[] }) => {
    if (!data.deviceId) return;
    try {
      const device = await prisma.device.findUnique({ where: { id: data.deviceId } });
      const deviceName = device ? device.name : 'Thiết bị';
      connectedSoundCards.set(data.deviceId, {
        deviceId: data.deviceId,
        deviceName: deviceName,
        cards: data.cards
      });
      // Broadcast cho tất cả Admin đang kết nối
      io.emit('AVAILABLE_SOUND_CARDS', Array.from(connectedSoundCards.values()));
    } catch (err) {
      console.error('Error fetching device name for sound cards:', err);
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
    if (socket.data.deviceId) {
      // Khi một device ngắt kết nối, dọn dẹp khỏi danh sách soundcard nếu cần
      // Lưu ý: Nếu muốn lưu lại offline, thì không xoá. Ở đây xoá để Admin thấy real-time
      connectedSoundCards.delete(socket.data.deviceId);
      io.emit('AVAILABLE_SOUND_CARDS', Array.from(connectedSoundCards.values()));
    }
  });
});


// Start scheduler


// Serve Frontend Static Files
const FRONTEND_DIST = path.join(__dirname, '..', '..', 'frontend', 'dist');
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
import('./prisma').then((m) => m.initDB()).then(() => import('./seed')).then(() => {
  httpServer.listen(parseInt(PORT as string, 10), '0.0.0.0', () => {
    reloadScheduleCache().then(() => startScheduler(io));
    console.log(`\n🔔 AutoBells Backend running on port ${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/api/health\n`);
  });
}).catch((err) => {
  console.error("Failed to seed database:", err);
  httpServer.listen(parseInt(PORT as string, 10), '0.0.0.0', () => {
    reloadScheduleCache().then(() => startScheduler(io));
    console.log(`\n🔔 AutoBells Backend running on port ${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/api/health\n`);
  });
});
