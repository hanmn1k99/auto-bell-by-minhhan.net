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
exports.getSocketIo = exports.deviceCache = exports.io = void 0;
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
const setup_1 = __importDefault(require("./routes/setup"));
const users_1 = __importDefault(require("./routes/users"));
const departments_1 = __importDefault(require("./routes/departments"));
const bells_1 = __importDefault(require("./routes/bells"));
const periods_1 = __importDefault(require("./routes/periods"));
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
exports.io = new socket_io_1.Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
});
const PORT = process.env.PORT || 3001;
// ====== IN-MEMORY DEVICE CACHE ======
// Lưu trạng thái thiết bị trong RAM để tránh spam DB mỗi khi thiết bị kết nối lại
exports.deviceCache = new Map();
// =====================================
// Directories
const UPLOADS_DIR = path_1.default.join(__dirname, '..', '..', 'uploads');
const ASSETS_DIR = path_1.default.join(__dirname, '..', '..', 'assets');
fs_1.default.mkdirSync(UPLOADS_DIR, { recursive: true });
fs_1.default.mkdirSync(ASSETS_DIR, { recursive: true });
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '100mb' }));
// Ngăn chặn Cloudflare hoặc Browser cache các request API
app.use('/api', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    next();
});
// Static files
app.use('/uploads', express_1.default.static(UPLOADS_DIR));
app.use('/assets', express_1.default.static(ASSETS_DIR));
app.use('/api/uploads', express_1.default.static(UPLOADS_DIR));
app.use('/api/assets', express_1.default.static(ASSETS_DIR));
const devices_1 = __importDefault(require("./routes/devices"));
const youtube_1 = __importDefault(require("./routes/youtube"));
// Routes
app.set('io', exports.io);
app.use('/api/setup', setup_1.default);
app.use('/api/auth', auth_1.default);
app.use('/api/files', files_1.default);
app.use('/api/playlists', playlists_1.default);
app.use('/api/schedules', schedules_1.default);
app.use('/api/youtube', youtube_1.default);
app.use('/api/devices', auth_2.authenticateToken, auth_2.authorizeAdmin, devices_1.default);
app.use('/api/users', auth_2.authenticateToken, auth_2.authorizeAdmin, users_1.default);
app.use('/api/departments', auth_2.authenticateToken, departments_1.default);
app.use('/api/bells', auth_2.authenticateToken, bells_1.default);
app.use('/api/periods', auth_2.authenticateToken, periods_1.default);
// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));
const getSocketIo = () => exports.io;
exports.getSocketIo = getSocketIo;
// Admin controls
app.post('/api/admin/next', auth_2.authenticateToken, (req, res) => {
    (0, scheduler_1.playNextTrack)(exports.io);
    res.json({ success: true });
});
app.post('/api/admin/prev', auth_2.authenticateToken, (req, res) => {
    (0, scheduler_1.playPrevTrack)(exports.io);
    res.json({ success: true });
});
app.post('/api/admin/pause', auth_2.authenticateToken, (req, res) => {
    (0, scheduler_1.pausePlayback)(exports.io);
    exports.io.emit('PAUSE_YOUTUBE_VIDEO');
    if (scheduler_1.currentYoutubeState) {
        (0, scheduler_1.setYoutubeState)({ ...scheduler_1.currentYoutubeState, status: 'paused' });
        (0, scheduler_1.broadcastState)(exports.io);
    }
    res.json({ success: true });
});
app.post('/api/admin/resume', auth_2.authenticateToken, (req, res) => {
    (0, scheduler_1.resumePlayback)(exports.io);
    exports.io.emit('RESUME_YOUTUBE_VIDEO');
    if (scheduler_1.currentYoutubeState) {
        (0, scheduler_1.setYoutubeState)({ ...scheduler_1.currentYoutubeState, status: 'playing' });
        (0, scheduler_1.broadcastState)(exports.io);
    }
    res.json({ success: true });
});
app.post('/api/admin/seek', auth_2.authenticateToken, (req, res) => {
    if (typeof req.body.time === 'number') {
        (0, scheduler_1.seekPlayback)(exports.io, req.body.time);
    }
    res.json({ success: true });
});
app.post('/api/admin/stop', auth_2.authenticateToken, (req, res) => {
    (0, scheduler_1.stopPlayback)(exports.io);
    exports.io.emit('STOP_YOUTUBE_VIDEO');
    (0, scheduler_1.setYoutubeState)(null);
    (0, scheduler_1.broadcastState)(exports.io);
    res.json({ success: true });
});
app.get('/api/admin/state', auth_2.authenticateToken, (req, res) => {
    res.json((0, scheduler_1.getCurrentState)());
});
app.post('/api/admin/volume', auth_2.authenticateToken, (req, res) => {
    const { volume } = req.body;
    if (typeof volume === 'number') {
        (0, scheduler_1.setGlobalVolume)(exports.io, volume);
    }
    res.json({ success: true, volume: (0, scheduler_1.getGlobalVolume)() });
});
app.post('/api/admin/test-sound-card', auth_2.authenticateToken, async (req, res) => {
    try {
        const { soundCardId } = req.body;
        const sampleAudio = await prisma.audioFile.findFirst();
        if (!sampleAudio) {
            return res.status(400).json({ error: 'Chưa có tệp âm thanh nào trong hệ thống để phát thử' });
        }
        exports.io.emit('PLAY_BELL', {
            url: sampleAudio.path,
            name: `Phát thử nghiệm (${soundCardId === 'card-1' ? 'Card 1 / Kênh Trái' : soundCardId === 'card-2' ? 'Card 2 / Kênh Phải' : soundCardId === 'all' ? 'Toàn hệ thống' : 'Card mặc định'})`,
            soundCardId: soundCardId || 'default',
            volume: 1,
            fadeInDuration: 0,
            targetTime: Date.now() + 500
        });
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.post('/api/admin/play-file/:id', auth_2.authenticateToken, async (req, res) => {
    try {
        await (0, scheduler_1.playManualFile)(exports.io, Number(req.params.id));
        res.json({ success: true });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
app.post('/api/admin/play-playlist/:id', auth_2.authenticateToken, async (req, res) => {
    try {
        await (0, scheduler_1.playManualPlaylist)(exports.io, Number(req.params.id));
        res.json({ success: true });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
app.post('/api/admin/queue-file/:id', auth_2.authenticateToken, async (req, res) => {
    try {
        await (0, scheduler_1.queueManualFile)(exports.io, Number(req.params.id));
        res.json({ success: true });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
app.post('/api/admin/queue-playlist/:id', auth_2.authenticateToken, async (req, res) => {
    try {
        await (0, scheduler_1.queueManualPlaylist)(exports.io, Number(req.params.id));
        res.json({ success: true });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// Khai báo bộ nhớ lưu trữ danh sách card âm thanh của các thiết bị Player
const connectedSoundCards = new Map();
// Gửi state hiện tại cho 1 socket cụ thể (không broadcast toàn room)
function emitStateToSocket(socket) {
    const state = (0, scheduler_1.getCurrentState)();
    if (state.tracks.length > 0) {
        const idx = Math.min(state.trackIndex, state.tracks.length - 1);
        socket.emit('SYNC_STATE', {
            currentTrack: state.tracks[idx],
            volume: state.playlistVolume ?? state.volume,
            fadeInDuration: (0, scheduler_1.getGlobalFadeInDuration)(),
            isOverride: state.playlistVolume !== null,
            targetTime: state.targetTime,
            status: state.status,
            pauseOffset: state.pauseOffset,
            upNext: state.tracks.slice(idx + 1),
            youtubeState: scheduler_1.currentYoutubeState
        });
    }
    else {
        socket.emit('SYNC_STATE', { currentTrack: null, status: 'stopped', upNext: [], youtubeState: scheduler_1.currentYoutubeState });
    }
}
// Socket.IO
exports.io.on('connection', async (socket) => {
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
    exports.io.emit('ONLINE_CLIENTS', exports.io.engine.clientsCount);
    // Gửi state luôn nếu là Admin
    if (isAdmin) {
        socket.join('approved'); // Admin tự động join room approved
        emitStateToSocket(socket); // Gửi đầy đủ state (âm thanh + youtube) cho Admin này
        socket.on('SET_VOLUME', (vol) => {
            (0, scheduler_1.setGlobalVolume)(exports.io, vol);
        });
        socket.on('SET_FADE_IN', (dur) => {
            (0, scheduler_1.setGlobalFadeInDuration)(exports.io, dur);
        });
        // Admin vừa kết nối, gửi danh sách sound cards hiện tại cho họ
        socket.emit('AVAILABLE_SOUND_CARDS', Array.from(connectedSoundCards.values()));
    }
    socket.emit('SET_VOLUME', { volume: (0, scheduler_1.getGlobalVolume)() });
    socket.emit('SET_FADE_IN', { fadeInDuration: (0, scheduler_1.getGlobalFadeInDuration)() });
    // Debounce DEVICES_UPDATED: gom nhiều sự kiện lại → chỉ broadcast 1 lần sau 600ms yên tĩnh
    let devicesUpdatedTimeout = null;
    const debouncedDevicesUpdated = () => {
        if (devicesUpdatedTimeout)
            clearTimeout(devicesUpdatedTimeout);
        devicesUpdatedTimeout = setTimeout(() => {
            exports.io.emit('DEVICES_UPDATED');
        }, 600);
    };
    socket.on('REGISTER_DEVICE', async (data) => {
        if (isAdmin)
            return;
        const { deviceId, name, wanIp } = data;
        if (!deviceId)
            return;
        try {
            // ⚡ BƯỚC 1: Kiểm tra RAM cache trước, tránh đập thẳng vào DB ⚡
            const cached = exports.deviceCache.get(deviceId);
            const now = Date.now();
            // Phân tích IP & Browser (không cần DB)
            let ipRaw = socket.handshake.headers['cf-connecting-ip'] || socket.handshake.headers['x-forwarded-for'] || socket.handshake.address || '';
            if (Array.isArray(ipRaw))
                ipRaw = ipRaw[0];
            let ip = wanIp || ipRaw.split(',')[0].trim();
            if (ip.startsWith('::ffff:'))
                ip = ip.replace('::ffff:', '');
            const uaString = socket.handshake.headers['user-agent'] || '';
            const parser = new ua_parser_js_1.default(uaString);
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
                }
                else {
                    socket.leave('approved');
                }
                // Cập nhật lastSeen trong DB không đồng bộ (fire-and-forget, không block)
                prisma.device.update({ where: { id: deviceId }, data: { lastSeen: new Date() } }).catch(() => { });
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
            let finalDevice = device;
            if (!device) {
                finalDevice = await prisma.device.create({
                    data: { id: deviceId, name: name || 'Thiết bị mới', ipAddress: ip, browserInfo }
                });
                // Thiết bị mới → cần broadcast để Admin biết
                debouncedDevicesUpdated();
            }
            else {
                // Chỉ cập nhật DB không đồng bộ (fire-and-forget)
                prisma.device.update({ where: { id: deviceId }, data: { lastSeen: new Date(), ipAddress: ip, browserInfo } }).catch(() => { });
            }
            const isApproved = finalDevice?.isApproved ?? false;
            // Lưu vào RAM cache
            exports.deviceCache.set(deviceId, { isApproved, lastWritten: now });
            socket.data.deviceId = deviceId;
            socket.data.isApproved = isApproved;
            socket.emit('DEVICE_STATUS', { isApproved });
            if (isApproved) {
                socket.join('approved');
                emitStateToSocket(socket);
            }
            else {
                socket.leave('approved');
            }
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
            (0, scheduler_1.handleTrackEnded)(exports.io);
        }
    });
    socket.on('REPORT_SOUND_CARDS', async (data) => {
        if (!data.deviceId)
            return;
        try {
            const device = await prisma.device.findUnique({ where: { id: data.deviceId } });
            const deviceName = device ? device.name : 'Thiết bị';
            connectedSoundCards.set(data.deviceId, {
                deviceId: data.deviceId,
                deviceName: deviceName,
                cards: data.cards
            });
            // Broadcast cho tất cả Admin đang kết nối
            exports.io.emit('AVAILABLE_SOUND_CARDS', Array.from(connectedSoundCards.values()));
        }
        catch (err) {
            console.error('Error fetching device name for sound cards:', err);
        }
    });
    const emitOnlineClients = () => {
        let count = 0;
        for (const [id, s] of exports.io.sockets.sockets) {
            if (!s.data.isAdmin)
                count++;
        }
        exports.io.emit('ONLINE_CLIENTS', count);
    };
    exports.io.emit('ONLINE_CLIENTS', exports.io.engine.clientsCount); // fallback
    emitOnlineClients();
    socket.on('disconnect', () => {
        console.log(`[Socket] Client disconnected: ${socket.id}`);
        emitOnlineClients();
        if (socket.data.deviceId) {
            // Khi một device ngắt kết nối, dọn dẹp khỏi danh sách soundcard nếu cần
            // Lưu ý: Nếu muốn lưu lại offline, thì không xoá. Ở đây xoá để Admin thấy real-time
            connectedSoundCards.delete(socket.data.deviceId);
            exports.io.emit('AVAILABLE_SOUND_CARDS', Array.from(connectedSoundCards.values()));
        }
    });
});
// Start scheduler
// Serve Frontend Static Files
const FRONTEND_DIST = path_1.default.join(__dirname, '..', '..', 'frontend', 'dist');
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
Promise.resolve().then(() => __importStar(require('./enable-wal'))).then(m => m.enableWAL()).then(() => Promise.resolve().then(() => __importStar(require('./prisma')))).then((m) => m.initDB()).then(() => Promise.resolve().then(() => __importStar(require('./seed')))).then(() => {
    httpServer.listen(parseInt(PORT, 10), '0.0.0.0', () => {
        (0, scheduler_1.reloadScheduleCache)().then(() => (0, scheduler_1.startScheduler)(exports.io));
        console.log(`\n🔔 AutoBells Backend running on port ${PORT}`);
        console.log(`   Health: http://localhost:${PORT}/api/health\n`);
    });
}).catch((err) => {
    console.error("Failed to seed database:", err);
    httpServer.listen(parseInt(PORT, 10), '0.0.0.0', () => {
        (0, scheduler_1.reloadScheduleCache)().then(() => (0, scheduler_1.startScheduler)(exports.io));
        console.log(`\n🔔 AutoBells Backend running on port ${PORT}`);
        console.log(`   Health: http://localhost:${PORT}/api/health\n`);
    });
});
