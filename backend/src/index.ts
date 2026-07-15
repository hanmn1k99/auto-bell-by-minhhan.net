import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

import authRoutes from './routes/auth';
import fileRoutes from './routes/files';
import playlistRoutes from './routes/playlists';
import scheduleRoutes from './routes/schedules';
import { startScheduler, playNextTrack, stopPlayback, getCurrentState, playManualFile, playManualPlaylist, getGlobalVolume, setGlobalVolume, handleTrackEnded } from './scheduler';
import { authenticateToken } from './middleware/auth';

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

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/schedules', scheduleRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Admin controls
app.post('/api/admin/next', authenticateToken, (req, res) => {
  playNextTrack(io);
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

// Socket.IO
io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);
  // Send current state to newly connected client
  const state = getCurrentState();
  if (state.tracks.length > 0) {
    const idx = Math.min(state.trackIndex, state.tracks.length - 1);
    socket.emit('SYNC_STATE', { 
      currentTrack: state.tracks[idx],
      volume: state.playlistVolume ?? state.volume,
      isOverride: state.playlistVolume !== null
    });
  } else {
    socket.emit('SYNC_STATE', { currentTrack: null });
  }
  socket.emit('SET_VOLUME', { volume: getGlobalVolume() });

  socket.on('PING_TIME', (clientTime: number) => {
    socket.emit('PONG_TIME', { clientTime, serverTime: Date.now() });
  });

  socket.on('TRACK_ENDED', () => {
    handleTrackEnded(io);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

// Start scheduler
startScheduler(io);

// Serve Frontend Static Files
const FRONTEND_DIST = path.join(process.cwd(), '..', 'frontend', 'dist');
if (fs.existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));
  app.use((req, res) => {
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
