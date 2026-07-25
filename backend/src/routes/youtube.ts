import { Router, Request, Response } from 'express';
import ytdl from '@distube/ytdl-core';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';

if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}

const prisma = new PrismaClient();
const router = Router();
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

function sanitizeFilename(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s_-]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .toLowerCase();
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// POST /api/youtube/info - Phân tích thông tin Video YouTube
router.post('/info', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'Vui lòng cung cấp đường dẫn YouTube hợp lệ' });
    }

    if (!ytdl.validateURL(url)) {
      return res.status(400).json({ error: 'Đường dẫn YouTube không hợp lệ hoặc không được hỗ trợ' });
    }

    const info = await ytdl.getInfo(url);
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
  } catch (err: any) {
    console.error('YouTube info error:', err);
    res.status(500).json({ error: err.message || 'Không thể trích xuất thông tin video YouTube' });
  }
});

// POST /api/youtube/download - Tải nhạc MP3 từ YouTube và lưu vào CSDL
router.post('/download', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { url, customTitle } = req.body;
    if (!url || !ytdl.validateURL(url)) {
      return res.status(400).json({ error: 'Đường dẫn YouTube không hợp lệ' });
    }

    const info = await ytdl.getInfo(url);
    const durationSeconds = parseInt(info.videoDetails.lengthSeconds, 10) || 0;
    if (durationSeconds > 3600) {
      return res.status(400).json({ error: 'Video vượt quá thời lượng tối đa cho phép (tối đa 60 phút)' });
    }

    const rawTitle = (customTitle && customTitle.trim()) ? customTitle.trim() : info.videoDetails.title;
    const cleanName = sanitizeFilename(rawTitle) || 'yt-audio';
    const filename = `${cleanName}-${Date.now()}.mp3`;
    const outputPath = path.join(UPLOADS_DIR, filename);

    const audioStream = ytdl(url, { filter: 'audioonly', quality: 'highestaudio' });

    ffmpeg(audioStream)
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
        } catch (dbErr: any) {
          res.status(500).json({ error: 'Lỗi lưu vào Cơ sở dữ liệu: ' + dbErr.message });
        }
      })
      .on('error', (err: any) => {
        console.error('FFmpeg convert error:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Lỗi chuyển đổi âm thanh MP3: ' + err.message });
        }
      })
      .save(outputPath);

  } catch (err: any) {
    console.error('YouTube download error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'Lỗi xử lý tải nhạc YouTube' });
    }
  }
});

// POST /api/youtube/play-video - Phát Video YouTube trực tiếp lên Player
router.post('/play-video', authenticateToken, async (req: Request, res: Response) => {
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
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Lỗi phát Video YouTube' });
  }
});

// POST /api/youtube/stop-video - Dừng Video YouTube trên Player
router.post('/stop-video', authenticateToken, async (req: Request, res: Response) => {
  try {
    const io = req.app.get('io');
    if (io) {
      io.emit('STOP_YOUTUBE_VIDEO');
    }
    res.json({ success: true, message: 'Đã dừng Video YouTube trên Player' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Lỗi dừng Video YouTube' });
  }
});

export default router;
