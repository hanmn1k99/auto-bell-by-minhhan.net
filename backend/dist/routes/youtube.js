"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ytdl_core_1 = __importDefault(require("@distube/ytdl-core"));
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const ffmpeg_static_1 = __importDefault(require("ffmpeg-static"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
if (ffmpeg_static_1.default) {
    fluent_ffmpeg_1.default.setFfmpegPath(ffmpeg_static_1.default);
}
const prisma = new client_1.PrismaClient();
const router = (0, express_1.Router)();
const UPLOADS_DIR = path_1.default.join(process.cwd(), 'uploads');
if (!fs_1.default.existsSync(UPLOADS_DIR)) {
    fs_1.default.mkdirSync(UPLOADS_DIR, { recursive: true });
}
function sanitizeFilename(name) {
    return name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9\s_-]/g, '')
        .trim()
        .replace(/\s+/g, '_')
        .toLowerCase();
}
function formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}
// POST /api/youtube/info - Phân tích thông tin Video YouTube
router.post('/info', auth_1.authenticateToken, async (req, res) => {
    try {
        const { url } = req.body;
        if (!url || typeof url !== 'string') {
            return res.status(400).json({ error: 'Vui lòng cung cấp đường dẫn YouTube hợp lệ' });
        }
        if (!ytdl_core_1.default.validateURL(url)) {
            return res.status(400).json({ error: 'Đường dẫn YouTube không hợp lệ hoặc không được hỗ trợ' });
        }
        const info = await ytdl_core_1.default.getInfo(url);
        const videoDetails = info.videoDetails;
        const durationSeconds = parseInt(videoDetails.lengthSeconds, 10) || 0;
        if (durationSeconds > 3600) {
            return res.status(400).json({ error: 'Video vượt quá thời lượng tối đa cho phép (tối đa 60 phút)' });
        }
        const videoId = videoDetails.videoId;
        const title = videoDetails.title;
        const thumbnail = videoDetails.thumbnails && videoDetails.thumbnails.length > 0
            ? videoDetails.thumbnails[videoDetails.thumbnails.length - 1].url
            : `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
        res.json({
            videoId,
            title,
            durationSeconds,
            formattedDuration: formatDuration(durationSeconds),
            thumbnail,
            url
        });
    }
    catch (err) {
        console.error('YouTube info error:', err);
        res.status(500).json({ error: err.message || 'Không thể trích xuất thông tin video YouTube' });
    }
});
// POST /api/youtube/download - Tải nhạc MP3 từ YouTube và lưu vào CSDL
router.post('/download', auth_1.authenticateToken, async (req, res) => {
    try {
        const { url, customTitle } = req.body;
        if (!url || !ytdl_core_1.default.validateURL(url)) {
            return res.status(400).json({ error: 'Đường dẫn YouTube không hợp lệ' });
        }
        const info = await ytdl_core_1.default.getInfo(url);
        const durationSeconds = parseInt(info.videoDetails.lengthSeconds, 10) || 0;
        if (durationSeconds > 3600) {
            return res.status(400).json({ error: 'Video vượt quá thời lượng tối đa cho phép (tối đa 60 phút)' });
        }
        const rawTitle = (customTitle && customTitle.trim()) ? customTitle.trim() : info.videoDetails.title;
        const cleanName = sanitizeFilename(rawTitle) || 'yt-audio';
        const filename = `${cleanName}-${Date.now()}.mp3`;
        const outputPath = path_1.default.join(UPLOADS_DIR, filename);
        const audioStream = (0, ytdl_core_1.default)(url, { filter: 'audioonly', quality: 'highestaudio' });
        (0, fluent_ffmpeg_1.default)(audioStream)
            .audioCodec('libmp3lame')
            .audioBitrate(320)
            .audioFrequency(48000)
            .toFormat('mp3')
            .on('end', async () => {
            try {
                const audioFile = await prisma.audioFile.create({
                    data: {
                        name: rawTitle,
                        filename: filename,
                        path: `/uploads/${filename}`
                    }
                });
                res.json({ success: true, audioFile, message: 'Đã tải và lưu nhạc MP3 thành công!' });
            }
            catch (dbErr) {
                res.status(500).json({ error: 'Lỗi lưu vào Cơ sở dữ liệu: ' + dbErr.message });
            }
        })
            .on('error', (err) => {
            console.error('FFmpeg convert error:', err);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Lỗi chuyển đổi âm thanh MP3: ' + err.message });
            }
        })
            .save(outputPath);
    }
    catch (err) {
        console.error('YouTube download error:', err);
        if (!res.headersSent) {
            res.status(500).json({ error: err.message || 'Lỗi xử lý tải nhạc YouTube' });
        }
    }
});
// POST /api/youtube/play-video - Phát Video YouTube trực tiếp lên Player
router.post('/play-video', auth_1.authenticateToken, async (req, res) => {
    try {
        const { videoId, title } = req.body;
        if (!videoId) {
            return res.status(400).json({ error: 'Thiếu thông tin Video ID' });
        }
        const io = req.app.get('io');
        if (io) {
            io.emit('PLAY_YOUTUBE_VIDEO', { videoId, title: title || 'Video YouTube' });
        }
        res.json({ success: true, message: 'Đã gửi lệnh phát Video YouTube lên Player!' });
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Lỗi phát Video YouTube' });
    }
});
// POST /api/youtube/pause-video - Tạm dừng Video YouTube trên Player
router.post('/pause-video', auth_1.authenticateToken, async (req, res) => {
    try {
        const io = req.app.get('io');
        if (io) {
            io.emit('PAUSE_YOUTUBE_VIDEO');
        }
        res.json({ success: true, message: 'Đã tạm dừng Video YouTube trên Player' });
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Lỗi tạm dừng Video YouTube' });
    }
});
// POST /api/youtube/resume-video - Phát tiếp Video YouTube trên Player
router.post('/resume-video', auth_1.authenticateToken, async (req, res) => {
    try {
        const io = req.app.get('io');
        if (io) {
            io.emit('RESUME_YOUTUBE_VIDEO');
        }
        res.json({ success: true, message: 'Đã phát tiếp Video YouTube trên Player' });
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Lỗi phát tiếp Video YouTube' });
    }
});
// POST /api/youtube/stop-video - Dừng Video YouTube trên Player
router.post('/stop-video', auth_1.authenticateToken, async (req, res) => {
    try {
        const io = req.app.get('io');
        if (io) {
            io.emit('STOP_YOUTUBE_VIDEO');
        }
        res.json({ success: true, message: 'Đã dừng Video YouTube trên Player' });
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Lỗi dừng Video YouTube' });
    }
});
exports.default = router;
