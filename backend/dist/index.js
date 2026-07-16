"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSocketIo = void 0;
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const ua_parser_js_1 = __importDefault(require("ua-parser-js"));
dotenv_1.default.config();
const auth_1 = __importDefault(require("./routes/auth"));
const files_1 = __importDefault(require("./routes/files"));
const playlists_1 = __importDefault(require("./routes/playlists"));
const schedules_1 = __importDefault(require("./routes/schedules"));
const scheduler_1 = require("./scheduler");
const auth_2 = require("./middleware/auth");
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
});
const PORT = process.env.PORT || 3001;
// Directories
const UPLOADS_DIR = path_1.default.join(process.cwd(), '..', 'uploads');
const ASSETS_DIR = path_1.default.join(process.cwd(), '..', 'assets');
fs_1.default.mkdirSync(UPLOADS_DIR, { recursive: true });
fs_1.default.mkdirSync(ASSETS_DIR, { recursive: true });
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Static files
app.use('/uploads', express_1.default.static(UPLOADS_DIR));
app.use('/assets', express_1.default.static(ASSETS_DIR));
const devices_1 = __importDefault(require("./routes/devices"));
// Routes
app.use('/api/auth', auth_1.default);
app.use('/api/files', files_1.default);
app.use('/api/playlists', playlists_1.default);
app.use('/api/schedules', schedules_1.default);
app.use('/api/devices', devices_1.default);
// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));
const getSocketIo = () => io;
exports.getSocketIo = getSocketIo;
// Admin controls
app.post('/api/admin/next', auth_2.authenticateToken, (req, res) => {
    (0, scheduler_1.playNextTrack)(io);
    res.json({ success: true });
});
app.post('/api/admin/prev', auth_2.authenticateToken, (req, res) => {
    (0, scheduler_1.playPrevTrack)(io);
    res.json({ success: true });
});
app.post('/api/admin/pause', auth_2.authenticateToken, (req, res) => {
    (0, scheduler_1.pausePlayback)(io);
    res.json({ success: true });
});
app.post('/api/admin/resume', auth_2.authenticateToken, (req, res) => {
    (0, scheduler_1.resumePlayback)(io);
    res.json({ success: true });
});
app.post('/api/admin/seek', auth_2.authenticateToken, (req, res) => {
    if (typeof req.body.time === 'number') {
        (0, scheduler_1.seekPlayback)(io, req.body.time);
    }
    res.json({ success: true });
});
app.post('/api/admin/stop', auth_2.authenticateToken, (req, res) => {
    (0, scheduler_1.stopPlayback)(io);
    res.json({ success: true });
});
app.get('/api/admin/state', auth_2.authenticateToken, (req, res) => {
    res.json((0, scheduler_1.getCurrentState)());
});
app.post('/api/admin/volume', auth_2.authenticateToken, (req, res) => {
    const { volume } = req.body;
    if (typeof volume === 'number') {
        (0, scheduler_1.setGlobalVolume)(io, volume);
    }
    res.json({ success: true, volume: (0, scheduler_1.getGlobalVolume)() });
});
app.post('/api/admin/play-file/:id', auth_2.authenticateToken, async (req, res) => {
    try {
        await (0, scheduler_1.playManualFile)(io, Number(req.params.id));
        res.json({ success: true });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
app.post('/api/admin/play-playlist/:id', auth_2.authenticateToken, async (req, res) => {
    try {
        await (0, scheduler_1.playManualPlaylist)(io, Number(req.params.id));
        res.json({ success: true });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
app.post('/api/admin/queue-file/:id', auth_2.authenticateToken, async (req, res) => {
    try {
        await (0, scheduler_1.queueManualFile)(io, Number(req.params.id));
        res.json({ success: true });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
app.post('/api/admin/queue-playlist/:id', auth_2.authenticateToken, async (req, res) => {
    try {
        await (0, scheduler_1.queueManualPlaylist)(io, Number(req.params.id));
        res.json({ success: true });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// Socket.IO
io.on('connection', async (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);
    // Kiểm tra token admin
    let isAdmin = false;
    try {
        const token = socket.handshake.auth?.token;
        if (token) {
            jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'super_secret_jwt_key_123');
            isAdmin = true;
        }
    }
    catch (e) { }
    socket.data.isAdmin = isAdmin;
    io.emit('ONLINE_CLIENTS', io.engine.clientsCount);
    // Gửi state luôn nếu là Admin
    if (isAdmin) {
        socket.join('approved'); // Admin tự động join room approved
        const state = (0, scheduler_1.getCurrentState)();
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
        }
        else {
            socket.emit('SYNC_STATE', { currentTrack: null, status: 'stopped', upNext: [] });
        }
    }
    socket.emit('SET_VOLUME', { volume: (0, scheduler_1.getGlobalVolume)() });
    socket.on('REGISTER_DEVICE', async (data) => {
        console.log(`[Socket] Received REGISTER_DEVICE from ${socket.id}:`, data);
        if (isAdmin)
            return;
        const { deviceId, name } = data;
        if (!deviceId)
            return;
        try {
            let device = await prisma.device.findUnique({ where: { id: deviceId } });
            let ipRaw = socket.handshake.headers['cf-connecting-ip'] || socket.handshake.headers['x-forwarded-for'] || socket.handshake.address || '';
            if (Array.isArray(ipRaw))
                ipRaw = ipRaw[0];
            let ip = ipRaw.split(',')[0].trim();
            if (ip.startsWith('::ffff:'))
                ip = ip.replace('::ffff:', '');
            const uaString = socket.handshake.headers['user-agent'] || '';
            const parser = new ua_parser_js_1.default(uaString);
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
            }
            else {
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
                const state = (0, scheduler_1.getCurrentState)();
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
                }
                else {
                    socket.emit('SYNC_STATE', { currentTrack: null, status: 'stopped', upNext: [] });
                }
            }
            else {
                socket.leave('approved');
            }
            io.emit('DEVICES_UPDATED');
        }
        catch (err) {
            console.error('[Socket] Device registration error:', err);
        }
    });
    socket.on('PING_TIME', (clientTime) => {
        socket.emit('PONG_TIME', { clientTime, serverTime: Date.now() });
    });
    socket.on('TRACK_ENDED', () => {
        // Chỉ chấp nhận nếu là client được duyệt hoặc admin
        if (socket.data.isAdmin || socket.data.isApproved) {
            (0, scheduler_1.handleTrackEnded)(io);
        }
    });
    const emitOnlineClients = () => {
        let count = 0;
        for (const [id, s] of io.sockets.sockets) {
            if (!s.data.isAdmin)
                count++;
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
(0, scheduler_1.startScheduler)(io);
// Serve Frontend Static Files
const FRONTEND_DIST = path_1.default.join(process.cwd(), '..', 'frontend', 'dist');
if (fs_1.default.existsSync(FRONTEND_DIST)) {
    app.use(express_1.default.static(FRONTEND_DIST, { index: false }));
    app.use((req, res) => {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('Surrogate-Control', 'no-store');
        res.sendFile(path_1.default.join(FRONTEND_DIST, 'index.html'));
    });
}
else {
    console.warn(`[Warn] Frontend dist not found at ${FRONTEND_DIST}. Please build frontend first.`);
}
// Seed database on startup
Promise.resolve().then(() => __importStar(require('./seed'))).catch(() => { });
httpServer.listen(PORT, () => {
    console.log(`\n🔔 AutoBells Backend running on port ${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/api/health\n`);
});
