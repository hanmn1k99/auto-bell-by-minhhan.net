import { Router, Request, Response } from 'express';
// @ts-ignore
import * as searchApi from 'youtube-search-api';
import ytdl from '@distube/ytdl-core';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';
import { io } from '../index';
import { setYoutubeState, broadcastState, currentYoutubeState } from '../scheduler'; // Added io import

if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}

const prisma = new PrismaClient();
const router = Router();
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

function sanitizeFilename(name: string) {
  return name.replace(/[^a-z0-9àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ\s-]/gi, '').replace(/\s+/g, '-');
}

// POST /api/youtube/search - Tìm kiếm video trên YouTube
router.post('/search', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { q } = req.body;
    if (!q) return res.status(400).json({ error: 'Thiếu từ khóa tìm kiếm' });

    // Validate if URL instead of query
    if (ytdl.validateURL(q)) {
      const info = await ytdl.getInfo(q);
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
      .filter((item: any) => item.type === 'video')
      .map((item: any) => {
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
                if (unit === 'K') num *= 1000;
                else if (unit === 'M') num *= 1000000;
                else if (unit === 'B') num *= 1000000000;
                views = Math.floor(num);
            }
        } else if (item.viewCountText && item.viewCountText.simpleText) {
             const clean = item.viewCountText.simpleText.replace(/[^0-9]/g, '');
             if (clean) views = parseInt(clean, 10);
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
  } catch (err: any) {
    console.error('YouTube search error:', err);
    res.status(500).json({ error: 'Lỗi tìm kiếm YouTube' });
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

    // Pick best audio format manually to avoid highestaudio crash
    const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
    if (!audioFormats || audioFormats.length === 0) {
        return res.status(400).json({ error: 'Không tìm thấy định dạng âm thanh nào cho video này. Video có thể đã bị hạn chế.' });
    }
    audioFormats.sort((a, b) => (b.audioBitrate || 0) - (a.audioBitrate || 0));
    const format = audioFormats[0];

    const audioStream = ytdl.downloadFromInfo(info, { format: format });
    
    // Broadcast progress using socket.io to the frontend
    audioStream.on('progress', (chunkLength, downloaded, total) => {
        const percent = total ? ((downloaded / total) * 100).toFixed(1) : '0';
        io.emit('yt_download_progress', { url, progress: percent });
    });

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
          io.emit('yt_download_progress', { url, progress: '100' });
          res.json({ success: true, audioFile, message: 'Đã tải và lưu nhạc MP3 thành công!' });
        } catch (dbErr: any) {
          res.status(500).json({ error: 'Lỗi lưu vào Cơ sở dữ liệu: ' + dbErr.message });
        }
      })
      .on('error', (err: any) => {
        console.error('FFmpeg convert error:', err);
        io.emit('yt_download_progress', { url, progress: 'Lỗi' });
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

    io.emit('PLAY_YOUTUBE_VIDEO', { videoId, title: title || 'Video YouTube' });
    setYoutubeState({ videoId, title: title || 'Video YouTube', status: 'playing' });
    broadcastState(io);

    res.json({ success: true, message: 'Đã gửi lệnh phát Video YouTube lên Player!' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Lỗi phát Video YouTube' });
  }
});

// POST /api/youtube/pause-video - Tạm dừng Video YouTube trên Player
router.post('/pause-video', authenticateToken, async (req: Request, res: Response) => {
  try {
    io.emit('PAUSE_YOUTUBE_VIDEO');
    if (currentYoutubeState) setYoutubeState({ ...currentYoutubeState, status: 'paused' });
    broadcastState(io);
    res.json({ success: true, message: 'Đã tạm dừng Video YouTube trên Player' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Lỗi tạm dừng Video YouTube' });
  }
});

// POST /api/youtube/resume-video - Phát tiếp Video YouTube trên Player
router.post('/resume-video', authenticateToken, async (req: Request, res: Response) => {
  try {
    io.emit('RESUME_YOUTUBE_VIDEO');
    if (currentYoutubeState) setYoutubeState({ ...currentYoutubeState, status: 'playing' });
    broadcastState(io);
    res.json({ success: true, message: 'Đã phát tiếp Video YouTube trên Player' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Lỗi phát tiếp Video YouTube' });
  }
});

// POST /api/youtube/stop-video - Dừng Video YouTube trên Player
router.post('/stop-video', authenticateToken, async (req: Request, res: Response) => {
  try {
    io.emit('STOP_YOUTUBE_VIDEO');
    setYoutubeState(null);
    broadcastState(io);
    res.json({ success: true, message: 'Đã dừng Video YouTube trên Player' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Lỗi dừng Video YouTube' });
  }
});

// POST /api/youtube/command - Gửi lệnh tùy chỉnh (CC, Quality, etc) tới Player
router.post('/command', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { command, arg } = req.body;
    io.emit('YT_COMMAND', { command, arg });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Lỗi gửi lệnh YouTube' });
  }
});

export default router;
