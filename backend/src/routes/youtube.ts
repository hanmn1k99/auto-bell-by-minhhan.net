import { Router, Request, Response } from 'express';
// @ts-ignore
import * as searchApi from 'youtube-search-api';
import ytdl from '@distube/ytdl-core';
import youtubedl from 'youtube-dl-exec';

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

// GET /api/youtube/suggest - Lấy gợi ý tìm kiếm
router.get('/suggest', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string') return res.json([]);
    const url = `http://suggestqueries.google.com/complete/search?client=firefox&ds=yt&oe=utf-8&hl=vi&q=${encodeURIComponent(q)}`;
    const response = await fetch(url);
    const data = await response.json();
    res.json(data[1] || []);
  } catch (err: any) {
    res.status(500).json({ error: 'Lỗi lấy gợi ý YouTube' });
  }
});

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
    if (!url) {
      return res.status(400).json({ error: 'Đường dẫn YouTube không hợp lệ' });
    }

    const info = await youtubedl(url, {
      dumpJson: true,
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true
    }) as any;

    const durationSeconds = info.duration || 0;
    if (durationSeconds > 3600) {
      return res.status(400).json({ error: 'Video vượt quá thời lượng tối đa cho phép (tối đa 60 phút)' });
    }

    const rawTitle = (customTitle && customTitle.trim()) ? customTitle.trim() : info.title;
    const cleanName = sanitizeFilename(rawTitle) || 'yt-audio';
    const filename = `${cleanName}-${Date.now()}.mp3`;
    const outputPath = path.join(UPLOADS_DIR, filename);

        // Use yt-dlp native download to avoid SIGSEGV in fluent-ffmpeg
    const ffmpegPath = require('ffmpeg-static');
    const child = youtubedl.exec(url, {
      extractAudio: true,
      audioFormat: 'mp3',
      output: outputPath,
      ffmpegLocation: '"' + ffmpegPath + '"',
      noWarnings: true
    });

    child.stdout?.on('data', (data) => {
      const str = data.toString();
      const match = str.match(/\[download\]\s+(\d+\.\d+)%/);
      if (match) {
        const percent = parseFloat(match[1]).toFixed(1);
        io.emit('yt_download_progress', { url, progress: percent });
      }
    });

    child.on('close', async (code) => {
      if (code === 0) {
        try {
          const audioFile = await prisma.audioFile.create({
            data: {
              name: rawTitle,
              filename: filename,
              path: '/uploads/' + filename
            }
          });
          io.emit('yt_download_progress', { url, progress: '100' });
          if (!res.headersSent) {
            res.json({ success: true, audioFile, message: 'Th\u00E0nh c\u00F4ng' });
          }
        } catch (dbErr: any) {
          if (!res.headersSent) {
            res.status(500).json({ error: 'DB Error: ' + dbErr.message });
          }
        }
      } else {
        io.emit('yt_download_progress', { url, progress: 'L\u1ED7i' });
        if (!res.headersSent) {
          res.status(500).json({ error: 'yt-dlp exited with code ' + code });
        }
      }
    });

    child.on('error', (err: any) => {
      console.error('yt-dlp error:', err);
      io.emit('yt_download_progress', { url, progress: 'L\u1ED7i' });
      if (!res.headersSent) {
        res.status(500).json({ error: 'L\u1ED7i chuy\u1EC3n \u0111\u1ED5i \u00E2m thanh MP3: ' + err.message });
      }
    });

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
    
    // Nếu là lệnh bật tắt CC, lưu lại trạng thái và đồng bộ
    if (command === 'toggleCC' && currentYoutubeState) {
      setYoutubeState({
        ...currentYoutubeState,
        isCCOn: !currentYoutubeState.isCCOn
      });
      broadcastState(io);
    }
    
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Lỗi gửi lệnh YouTube' });
  }
});

export default router;
