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
const express_1 = require("express");
// @ts-ignore
const searchApi = __importStar(require("youtube-search-api"));
const ytdl_core_1 = __importDefault(require("@distube/ytdl-core"));
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const ffmpeg_static_1 = __importDefault(require("ffmpeg-static"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const index_1 = require("../index"); // Added io import
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
    return name.replace(/[^a-z0-9àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ\s-]/gi, '').replace(/\s+/g, '-');
}
// POST /api/youtube/search - Tìm kiếm video trên YouTube
router.post('/search', auth_1.authenticateToken, async (req, res) => {
    try {
        const { q } = req.body;
        if (!q)
            return res.status(400).json({ error: 'Thiếu từ khóa tìm kiếm' });
        // Validate if URL instead of query
        if (ytdl_core_1.default.validateURL(q)) {
            const info = await ytdl_core_1.default.getInfo(q);
            const video = info.videoDetails;
            const durationStr = new Date((parseInt(video.lengthSeconds) || 0) * 1000).toISOString().substr(11, 8).replace(/^00:/, '');
            return res.json([{
                    videoId: video.videoId,
                    title: video.title,
                    thumbnail: video.thumbnails[video.thumbnails.length - 1]?.url || '',
                    formattedDuration: durationStr,
                    views: parseInt(video.viewCount) || 0,
                    url: q
                }]);
        }
        const results = await searchApi.GetListByKeyword(q, false, 20);
        if (!results || !results.items) {
            return res.json([]);
        }
        // Format results to match our frontend interface
        const formatted = results.items
            .filter((item) => item.type === 'video')
            .map((item) => {
            let durationStr = 'Live';
            if (item.length && item.length.simpleText) {
                durationStr = item.length.simpleText;
            }
            // Extract views
            let views = 0;
            if (item.shortViewCountText && item.shortViewCountText.simpleText) {
                const match = item.shortViewCountText.simpleText.match(/(\d+(?:\.\d+)?)([KMB]?)/i);
                if (match) {
                    let num = parseFloat(match[1]);
                    const unit = match[2].toUpperCase();
                    if (unit === 'K')
                        num *= 1000;
                    else if (unit === 'M')
                        num *= 1000000;
                    else if (unit === 'B')
                        num *= 1000000000;
                    views = Math.floor(num);
                }
            }
            else if (item.viewCountText && item.viewCountText.simpleText) {
                const clean = item.viewCountText.simpleText.replace(/[^0-9]/g, '');
                if (clean)
                    views = parseInt(clean, 10);
            }
            return {
                videoId: item.id,
                title: item.title,
                thumbnail: item.thumbnail?.thumbnails?.[0]?.url || `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
                formattedDuration: durationStr,
                views: views,
                url: `https://www.youtube.com/watch?v=${item.id}`
            };
        });
        res.json(formatted);
    }
    catch (err) {
        console.error('YouTube search error:', err);
        res.status(500).json({ error: 'Lỗi tìm kiếm YouTube' });
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
        // Pick best audio format manually to avoid highestaudio crash
        const audioFormats = ytdl_core_1.default.filterFormats(info.formats, 'audioonly');
        if (!audioFormats || audioFormats.length === 0) {
            return res.status(400).json({ error: 'Không tìm thấy định dạng âm thanh nào cho video này. Video có thể đã bị hạn chế.' });
        }
        audioFormats.sort((a, b) => (b.audioBitrate || 0) - (a.audioBitrate || 0));
        const format = audioFormats[0];
        const audioStream = ytdl_core_1.default.downloadFromInfo(info, { format: format });
        // Broadcast progress using socket.io to the frontend
        audioStream.on('progress', (chunkLength, downloaded, total) => {
            const percent = total ? ((downloaded / total) * 100).toFixed(1) : '0';
            index_1.io.emit('yt_download_progress', { url, progress: percent });
        });
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
                index_1.io.emit('yt_download_progress', { url, progress: '100' });
                res.json({ success: true, audioFile, message: 'Đã tải và lưu nhạc MP3 thành công!' });
            }
            catch (dbErr) {
                res.status(500).json({ error: 'Lỗi lưu vào Cơ sở dữ liệu: ' + dbErr.message });
            }
        })
            .on('error', (err) => {
            console.error('FFmpeg convert error:', err);
            index_1.io.emit('yt_download_progress', { url, progress: 'Lỗi' });
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
exports.default = router;
