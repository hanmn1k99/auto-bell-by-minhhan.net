import React from "react";
import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_URL } from './api';
import './player.css';

interface AudioEvent {
  url: string;
  name: string;
  type?: string;
  manual?: boolean;
  volume?: number;
  isOverride?: boolean;
  targetTime?: number;
  status?: string;
  pauseOffset?: number | null;
  fadeInDuration?: number;
  soundCardId?: string;
}

const socket: Socket = io(API_URL);

const getDeviceId = () => {
  let id = localStorage.getItem('deviceId');
  let createdAt = localStorage.getItem('deviceId_createdAt');
  
  // Hết hạn sau 7 ngày
  if (id && createdAt && Date.now() - parseInt(createdAt) > 7 * 24 * 60 * 60 * 1000) {
    id = null;
  }

  if (!id) {
    id = (typeof crypto !== 'undefined' && crypto.randomUUID) 
      ? crypto.randomUUID() 
      : Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem('deviceId', id);
    localStorage.setItem('deviceId_createdAt', Date.now().toString());
  }
  return id;
};

export default function PlayerPage() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [connected, setConnected] = useState(false);
  const [nowPlaying, setNowPlaying] = useState<AudioEvent | null>(null);
  const [bellPlaying, setBellPlaying] = useState<AudioEvent | null>(null);
  const [liveStreamInfo, setLiveStreamInfo] = useState<{ title: string; soundCardId?: string } | null>(null);
  const [youtubeVideoInfo, setYoutubeVideoInfo] = useState<{ videoId: string; title: string } | null>(null);
  const [isApproved, setIsApproved] = useState<boolean | null>(null);
  const [isRejected, setIsRejected] = useState(false);
  const [blockedUntil, setBlockedUntil] = useState<Date | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [interacted, setInteracted] = useState(false);
  const [vuMeterBar, setVuMeterBar] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const bellRef = useRef<HTMLAudioElement | null>(null);
  const liveAudioRef = useRef<HTMLAudioElement | null>(null);
  const ytIframeRef = useRef<HTMLIFrameElement | null>(null);
  const liveMediaSourceRef = useRef<MediaSource | null>(null);
  const liveSourceBufferRef = useRef<SourceBuffer | null>(null);
  const liveChunkQueueRef = useRef<ArrayBuffer[]>([]);

  useEffect(() => {
    document.title = 'Automation Audio System by minhhan.net';
    let manifestLink = document.querySelector("link[rel='manifest']") as HTMLLinkElement;
    if (!manifestLink) {
      manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      document.head.appendChild(manifestLink);
    }
    manifestLink.href = '/api/files/manifest.json?page=player';
  }, []);

  useEffect(() => {
    if (!bellPlaying && !nowPlaying) {
      setVuMeterBar(0);
      return;
    }
    const interval = setInterval(() => {
      setVuMeterBar(Math.floor(Math.random() * 5) + 4);
    }, 120);
    return () => clearInterval(interval);
  }, [bellPlaying, nowPlaying]);

  const timeOffset = useRef(0);
  const isApprovedRef = useRef(isApproved);
  const audioTimeout = useRef<any>(null);
  const bellTimeoutRef = useRef<any>(null);
  const audioFadeInterval = useRef<any>(null);
  const bellFadeInterval = useRef<any>(null);
  const musicWasPlayingBeforeBell = useRef(false);

  useEffect(() => {
    isApprovedRef.current = isApproved;
  }, [isApproved]);

  // Clock
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Load logo
  useEffect(() => {
    fetch(`${API_URL}/api/files/assets/info`)
      .then(r => r.json())
      .then(data => { if (data.logo) setLogoUrl(`${API_URL}${data.logo}`); })
      .catch(() => {});
  }, []);

  // Countdown timer for blocked device
  const [blockRemaining, setBlockRemaining] = useState<string>('');
  useEffect(() => {
    if (!blockedUntil) return;
    const interval = setInterval(() => {
      const diff = blockedUntil.getTime() - Date.now();
      if (diff <= 0) {
        setBlockRemaining('Đã hết hạn khóa, vui lòng tải lại trang.');
        clearInterval(interval);
      } else {
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        setBlockRemaining(`${h} giờ ${m} phút ${s} giây`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [blockedUntil]);

  const scanAndReportSoundCards = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioOutputs = devices.filter(d => d.kind === 'audiooutput' && d.deviceId !== 'default' && d.deviceId !== 'communications');
      
      const cards = audioOutputs.map(d => ({
        deviceId: d.deviceId,
        label: d.label || `Thiết bị âm thanh (${d.deviceId.substring(0, 5)})`
      }));

      // Báo cáo danh sách về server
      socket.emit('REPORT_SOUND_CARDS', {
        deviceId: getDeviceId(),
        cards
      });
    } catch (err) {
      console.warn('Không thể lấy danh sách thiết bị âm thanh:', err);
    }
  };

  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', scanAndReportSoundCards);
      return () => navigator.mediaDevices.removeEventListener('devicechange', scanAndReportSoundCards);
    }
  }, []);

  const schedulePlay = (
    audioEl: HTMLAudioElement | null,
    url: string,
    targetTime: number | undefined,
    volume: number | undefined,
    fadeInDuration: number | undefined,
    timeoutRef: React.MutableRefObject<any>,
    fadeIntervalRef: React.MutableRefObject<any>,
    soundCardId?: string
  ) => {
    if (!audioEl) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);

    const fullUrl = url.startsWith('http') ? url : `${API_URL}${url}`;
    
    // Bind hardware sound card via setSinkId if supported by browser
    if (typeof (audioEl as any).setSinkId === 'function' && soundCardId && soundCardId !== 'default' && soundCardId !== 'all' && soundCardId !== 'card-1' && soundCardId !== 'card-2') {
      (audioEl as any).setSinkId(soundCardId).catch(() => {});
    }

    // Chế độ Giả lập Multi-Card (Simulator Mode) - Tách Kênh Trái (Card 1) và Kênh Phải (Card 2)
    if (localStorage.getItem('isSimulatorMode') === 'true') {
      try {
        if (!(audioEl as any)._audioCtx) {
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioCtx) {
            const ctx = new AudioCtx();
            const srcNode = ctx.createMediaElementSource(audioEl);
            const panner = ctx.createStereoPanner();
            srcNode.connect(panner);
            panner.connect(ctx.destination);
            (audioEl as any)._audioCtx = ctx;
            (audioEl as any)._panner = panner;
          }
        }
        // Phải resume AudioContext nếu nó bị suspended do tạo ngoài user gesture
        if ((audioEl as any)._audioCtx && (audioEl as any)._audioCtx.state === 'suspended') {
          (audioEl as any)._audioCtx.resume().catch(() => {});
        }
        if ((audioEl as any)._panner) {
          if (soundCardId === 'card-1') (audioEl as any)._panner.pan.value = -1; // Kênh Trái
          else if (soundCardId === 'card-2') (audioEl as any)._panner.pan.value = 1; // Kênh Phải
          else (audioEl as any)._panner.pan.value = 0; // Trung tâm (Tất cả card)
        }
      } catch {
        // MediaElementAudioSourceNode only created once per HTMLAudioElement
      }
    }

    // Chỉ cập nhật src nếu nó thay đổi (tránh lỗi load lại mất tiếng)
    if (!audioEl.src || !audioEl.src.endsWith(url)) {
      audioEl.pause();
      audioEl.src = fullUrl;
      audioEl.load();
    }
    
    const targetVol = volume !== undefined ? volume : 1.0;
    const fadeTime = fadeInDuration !== undefined ? fadeInDuration * 1000 : 1000;
    
    // Khởi tạo âm lượng bằng 0 nếu có fade in
    audioEl.volume = fadeTime > 0 ? 0 : targetVol;

    if (!targetTime) {
      audioEl.play().catch((e) => console.error("Audio playback error:", e));
      startFadeIn(audioEl, targetVol, fadeTime, fadeIntervalRef);
      return;
    }

    const exactNow = Date.now() + timeOffset.current;
    const delay = targetTime - exactNow;

    if (delay > 0) {
      timeoutRef.current = setTimeout(() => {
        // Tránh set currentTime = 0 khi readyState = 0 có thể gây InvalidStateError
        audioEl.volume = fadeTime > 0 ? 0 : targetVol;
        audioEl.play().catch((e) => console.error("Audio playback error:", e));
        startFadeIn(audioEl, targetVol, fadeTime, fadeIntervalRef);
      }, delay);
    } else {
      const overDue = (exactNow - targetTime) / 1000;
      if (audioEl.duration && overDue < audioEl.duration) {
        audioEl.currentTime = overDue;
      }
      audioEl.volume = targetVol; // Bỏ qua fade in nếu phát quá trễ
      audioEl.play().catch((e) => console.error("Audio playback error:", e));
    }
  };

  const startFadeIn = (audioEl: HTMLAudioElement, targetVol: number, fadeTimeMs: number, intervalRef: React.MutableRefObject<any>) => {
    if (fadeTimeMs <= 0) {
      audioEl.volume = targetVol;
      return;
    }
    
    const steps = 20; // Số bước tăng âm lượng
    const stepTime = fadeTimeMs / steps;
    const volStep = targetVol / steps;
    let currentStep = 0;

    intervalRef.current = setInterval(() => {
      currentStep++;
      if (currentStep >= steps) {
        audioEl.volume = targetVol;
        clearInterval(intervalRef.current);
      } else {
        audioEl.volume = Math.min(targetVol, volStep * currentStep);
      }
    }, stepTime);
  };

  // Socket events
  useEffect(() => {
    const registerDevice = () => {
      setConnected(true);
      socket.emit('PING_TIME', Date.now());
      socket.emit('REGISTER_DEVICE', { deviceId: getDeviceId() });
      scanAndReportSoundCards();
    };

    if (socket.connected) {
      registerDevice();
    }

    socket.on('connect', registerDevice);
    
    socket.on('PONG_TIME', (data: { clientTime: number; serverTime: number }) => {
      const rtt = Date.now() - data.clientTime;
      timeOffset.current = data.serverTime - (Date.now() - rtt / 2);
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on('DEVICE_STATUS', (data: { isApproved: boolean }) => {
      setIsApproved(data.isApproved);
      if (!data.isApproved) {
        setNowPlaying(null);
        setBellPlaying(null);
        if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ''; }
        if (bellRef.current) { bellRef.current.pause(); bellRef.current.src = ''; }
      }
    });

    socket.on('DEVICE_DELETED', () => {
      localStorage.removeItem('deviceId');
      localStorage.removeItem('deviceId_createdAt');
      setIsRejected(true);
      if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ''; }
      if (bellRef.current) { bellRef.current.pause(); bellRef.current.src = ''; }
    });

    socket.on('DEVICE_BLOCKED', (data: { blockedUntil: string }) => {
      setBlockedUntil(new Date(data.blockedUntil));
      localStorage.removeItem('deviceId');
      localStorage.removeItem('deviceId_createdAt');
    });

    socket.on('PLAY_YOUTUBE_VIDEO', (data: { videoId: string; title: string }) => {
      if (!isApprovedRef.current) return;
      setYoutubeVideoInfo(data);
      if (audioRef.current) { audioRef.current.pause(); }
      if (bellRef.current) { bellRef.current.pause(); }
    });

    socket.on('PAUSE_YOUTUBE_VIDEO', () => {
      if (ytIframeRef.current && ytIframeRef.current.contentWindow) {
        ytIframeRef.current.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
      }
    });

    socket.on('RESUME_YOUTUBE_VIDEO', () => {
      if (ytIframeRef.current && ytIframeRef.current.contentWindow) {
        ytIframeRef.current.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
      }
    });

    socket.on('STOP_YOUTUBE_VIDEO', () => {
      setYoutubeVideoInfo(null);
    });

    // Hàm hỗ trợ kiểm tra xem sự kiện âm thanh này có phải của thiết bị này không
    const isForThisDevice = (targetSoundCardId?: string) => {
      if (!targetSoundCardId || ['default', 'all', 'card-1', 'card-2'].includes(targetSoundCardId)) return { forMe: true, realCardId: targetSoundCardId };
      const parts = targetSoundCardId.split('::');
      if (parts.length === 2) {
        const [tDeviceId, tCardId] = parts;
        if (tDeviceId !== getDeviceId()) return { forMe: false, realCardId: undefined };
        return { forMe: true, realCardId: tCardId };
      }
      // Nếu không có ::, xử lý như cũ
      return { forMe: true, realCardId: targetSoundCardId };
    };

    socket.on('PLAY_AUDIO', (data: AudioEvent) => {
      if (!isApprovedRef.current) return;
      // Zone Routing
      const { forMe, realCardId } = isForThisDevice(data.soundCardId);
      if (!forMe) return; // Drop silent

      setNowPlaying(data);
      schedulePlay(audioRef.current, data.url, data.targetTime, data.volume, data.fadeInDuration, audioTimeout, audioFadeInterval, realCardId);
    });

    socket.on('PLAY_BELL', (data: AudioEvent) => {
      if (!isApprovedRef.current) return;
      // Zone Routing
      const { forMe, realCardId } = isForThisDevice(data.soundCardId);
      if (!forMe) return; // Drop silent

      setBellPlaying(data);

      // Tự động tạm dừng nhạc nền nếu đang phát để tránh bị đè tiếng chuông
      if (audioRef.current && !audioRef.current.paused && audioRef.current.currentTime > 0) {
        musicWasPlayingBeforeBell.current = true;
        audioRef.current.pause();
      }

      schedulePlay(bellRef.current, data.url, data.targetTime, data.volume, data.fadeInDuration, bellTimeoutRef, bellFadeInterval, realCardId);
      setTimeout(() => setBellPlaying(null), 10000);
    });

    socket.on('SYNC_STATE', (data: { currentTrack: { path: string; name: string } | null; volume?: number; isOverride?: boolean; targetTime?: number; status?: string; pauseOffset?: number }) => {
      if (!isApprovedRef.current) return;
      if (data.status === 'stopped' || !data.currentTrack) {
        setNowPlaying(null);
        if (audioTimeout.current) clearTimeout(audioTimeout.current);
        if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ''; }
        return;
      }

      const evt: AudioEvent = { 
        url: data.currentTrack.path, 
        name: data.currentTrack.name, 
        volume: data.volume, 
        isOverride: data.isOverride, 
        targetTime: data.targetTime,
        status: data.status,
        pauseOffset: data.pauseOffset,
        fadeInDuration: (data as any).fadeInDuration
      };
      // Tránh việc gọi schedulePlay liên tục mỗi giây nếu trạng thái không đổi
      setNowPlaying(prev => {
        if (prev?.targetTime === data.targetTime && prev?.status === data.status && prev?.url === data.currentTrack?.path) {
          return prev;
        }
        return evt;
      });

      if (data.status === 'paused' && data.pauseOffset !== undefined && audioRef.current) {
        if (audioTimeout.current) clearTimeout(audioTimeout.current);
        audioRef.current.pause();
        const fullUrl = evt.url.startsWith('http') ? evt.url : `${API_URL}${evt.url}`;
        if (!audioRef.current.src.endsWith(evt.url)) {
          audioRef.current.src = fullUrl;
          audioRef.current.load();
        }
        // Đợi một chút để metadata kịp load trước khi tua (nếu đổi src)
        setTimeout(() => {
          if (audioRef.current) audioRef.current.currentTime = data.pauseOffset as number;
        }, 50);
      } else {
        schedulePlay(audioRef.current, evt.url, evt.targetTime, evt.volume, evt.fadeInDuration, audioTimeout, audioFadeInterval);
      }
    });

    socket.on('PAUSE_AUDIO', () => {
      if (audioTimeout.current) clearTimeout(audioTimeout.current);
      if (audioRef.current) audioRef.current.pause();
    });

    socket.on('STOP_AUDIO', () => {
      setNowPlaying(null);
      if (audioTimeout.current) clearTimeout(audioTimeout.current);
      if (audioFadeInterval.current) clearInterval(audioFadeInterval.current);
      if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ''; }
    });

    socket.on('SET_VOLUME', (data: { volume: number }) => {
      setNowPlaying(prev => prev ? { ...prev, volume: data.volume } : prev);
      if (audioRef.current) audioRef.current.volume = data.volume;
      if (bellRef.current) bellRef.current.volume = data.volume;
    });

    // Lắng nghe tín hiệu Phát trực tiếp Âm thanh Vật lý (Piano / Line-In)
    socket.on('START_LIVE_STREAM', (data: { soundCardId?: string; title?: string; mimeType?: string }) => {
      if (!isApprovedRef.current) return;
      
      // Zone Routing
      if (data.soundCardId) {
        const parts = data.soundCardId.split('::');
        if (parts.length === 2 && parts[0] !== getDeviceId()) return; // Drop silent
      }
      
      const realCardId = data.soundCardId?.includes('::') ? data.soundCardId.split('::')[1] : data.soundCardId;

      setLiveStreamInfo({ title: data.title || 'Phát trực tiếp Âm thanh Vật lý', soundCardId: realCardId });

      // Tạm dừng nhạc nền
      if (audioRef.current && !audioRef.current.paused) {
        musicWasPlayingBeforeBell.current = true;
        audioRef.current.pause();
      }

      if ('MediaSource' in window) {
        const ms = new MediaSource();
        liveMediaSourceRef.current = ms;
        liveChunkQueueRef.current = [];

        if (!liveAudioRef.current) {
          const el = new Audio();
          el.autoplay = true;
          liveAudioRef.current = el;
        }
        const liveEl = liveAudioRef.current;

        // Routing Sound Card
        if (typeof (liveEl as any).setSinkId === 'function' && data.soundCardId && data.soundCardId !== 'default' && data.soundCardId !== 'all' && data.soundCardId !== 'card-1' && data.soundCardId !== 'card-2') {
          (liveEl as any).setSinkId(data.soundCardId).catch(() => {});
        }

        ms.addEventListener('sourceopen', () => {
          try {
            const mime = data.mimeType || 'audio/webm;codecs=opus';
            const sb = ms.addSourceBuffer(mime);
            liveSourceBufferRef.current = sb;

            sb.addEventListener('updateend', () => {
              if (liveChunkQueueRef.current.length > 0 && !sb.updating) {
                const nextChunk = liveChunkQueueRef.current.shift();
                if (nextChunk) sb.appendBuffer(nextChunk);
              }
            });
          } catch (err) {
            console.error('SourceBuffer error:', err);
          }
        });

        liveEl.src = URL.createObjectURL(ms);
        liveEl.play().catch(() => {});
      }
    });

    socket.on('LIVE_STREAM_CHUNK', (chunk: ArrayBuffer) => {
      if (!isApprovedRef.current) return;
      const sb = liveSourceBufferRef.current;
      if (sb) {
        if (!sb.updating && liveChunkQueueRef.current.length === 0) {
          try {
            sb.appendBuffer(chunk);
          } catch {
            liveChunkQueueRef.current.push(chunk);
          }
        } else {
          liveChunkQueueRef.current.push(chunk);
        }
      }
    });

    socket.on('STOP_LIVE_STREAM', () => {
      setLiveStreamInfo(null);
      if (liveAudioRef.current) {
        liveAudioRef.current.pause();
        liveAudioRef.current.src = '';
      }
      liveMediaSourceRef.current = null;
      liveSourceBufferRef.current = null;
      liveChunkQueueRef.current = [];

      // Khôi phục nhạc nền
      if (musicWasPlayingBeforeBell.current && audioRef.current) {
        musicWasPlayingBeforeBell.current = false;
        audioRef.current.play().catch(() => {});
      }
    });

    return () => {
      socket.off('connect');
      socket.off('PONG_TIME');
      socket.off('disconnect');
      socket.off('DEVICE_STATUS');
      socket.off('DEVICE_DELETED');
      socket.off('PLAY_AUDIO');
      socket.off('PLAY_BELL');
      socket.off('PAUSE_AUDIO');
      socket.off('STOP_AUDIO');
      socket.off('SET_VOLUME');
      socket.off('SYNC_STATE');
    };
  }, []);

  const formatTime = (d: Date) => d.toLocaleTimeString('vi-VN', { hour12: false });
  const formatDate = (d: Date) => d.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        await navigator.wakeLock.request('screen');
      }
    } catch (err) {
      console.warn('Wake Lock không được hỗ trợ hoặc bị từ chối:', err);
    }
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && interacted) {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [interacted]);

  const unlockAudio = async () => {
    setInteracted(true);
    await requestWakeLock();
    // Bỏ chặn cho tất cả thẻ audio bằng cách play() sau đó pause() (iOS/Safari requirement)
    if (audioRef.current) {
      audioRef.current.play().catch(() => {});
      if (!nowPlaying) audioRef.current.pause();
    }
    if (bellRef.current) {
      bellRef.current.play().catch(() => {});
      if (!bellPlaying) bellRef.current.pause();
    }
    if (liveAudioRef.current) {
      liveAudioRef.current.play().catch(() => {});
      if (!liveStreamInfo) liveAudioRef.current.pause();
    }
    
    // Khởi tạo AudioContext cho chế độ giả lập nếu được bật (BẮT BUỘC phải làm trong user gesture)
    if (localStorage.getItem('isSimulatorMode') === 'true') {
      const initAudioCtx = (el: any) => {
        if (!el || el._audioCtx) return;
        try {
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioCtx) {
            const ctx = new AudioCtx();
            const srcNode = ctx.createMediaElementSource(el);
            const panner = ctx.createStereoPanner();
            srcNode.connect(panner);
            panner.connect(ctx.destination);
            el._audioCtx = ctx;
            el._panner = panner;
            if (ctx.state === 'suspended') ctx.resume().catch(() => {});
          }
        } catch (e) {
          console.warn('Cannot init AudioCtx:', e);
        }
      };
      initAudioCtx(audioRef.current);
      initAudioCtx(bellRef.current);
    }

    scanAndReportSoundCards();
  };

  return (
    <div className="player-root" onClick={!interacted ? unlockAudio : undefined}>
      {blockedUntil && (
        <div className="interaction-overlay">
          <div className="interaction-box" style={{ border: '1px solid #ef4444' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem', color: '#ef4444' }}>{React.createElement('ion-icon', { name: 'hand-right' })}</div>
            <h2 style={{ color: '#ef4444' }}>Thiết bị bị khóa</h2>
            <p style={{ marginTop: '0.5rem', marginBottom: '1.5rem', opacity: 0.8 }}>
              Thiết bị của bạn đã gửi yêu cầu quá nhiều lần và bị khóa tạm thời.
            </p>
            <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', fontSize: '1.2rem', fontWeight: 'bold' }}>
              Thời gian còn lại: <br />
              <span style={{ color: '#ef4444' }}>{blockRemaining}</span>
            </div>
            {blockRemaining === 'Đã hết hạn khóa, vui lòng tải lại trang.' && (
              <button className="btn btn-primary mt-3" onClick={() => window.location.reload()}>Tải lại trang</button>
            )}
          </div>
        </div>
      )}
      {!blockedUntil && isRejected && (
        <div className="interaction-overlay">
          <div className="interaction-box" style={{ border: '1px solid #ef4444' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem', color: '#ef4444' }}>{React.createElement('ion-icon', { name: 'ban' })}</div>
            <h2>Quyền truy cập bị từ chối</h2>
            <p style={{ marginTop: '0.5rem', marginBottom: '1.5rem', opacity: 0.8 }}>
              Thiết bị của bạn đã bị từ chối kết nối.
            </p>
            <button className="btn btn-primary" onClick={() => window.location.reload()}>Xin cấp lại quyền</button>
          </div>
        </div>
      )}
      {!blockedUntil && !isRejected && !interacted && (
        <div className="interaction-overlay" style={{ zIndex: 9999 }}>
          <div className="interaction-box">
            <div style={{ fontSize: '3rem', color: 'var(--accent)' }}>{React.createElement('ion-icon', { name: 'finger-print' })}</div>
            <h2>Bấm vào màn hình để bắt đầu</h2>
            <p>Trình duyệt yêu cầu tương tác để có thể phát âm thanh tự động.</p>
            <button className="btn btn-primary mt-2" onClick={unlockAudio}>Bắt đầu</button>
          </div>
        </div>
      )}
      
      {!blockedUntil && isApproved === false && (
        <div className="interaction-overlay" style={{ zIndex: 9999, background: 'rgba(11, 15, 26, 0.95)' }}>
          <div className="interaction-box" style={{ border: '1px solid #ef4444' }}>
            <div style={{ fontSize: '3rem', color: '#ef4444' }}>{React.createElement('ion-icon', { name: 'lock-closed' })}</div>
            <h2 style={{ color: '#ef4444' }}>Thiết bị chưa được cấp quyền</h2>
            <p>Vui lòng liên hệ Quản trị viên để phê duyệt thiết bị này (ID: {localStorage.getItem('deviceId')?.substring(0,6)}...)</p>
          </div>
        </div>
      )}

      <div className="player-bg-animated" />
      <div className="player-container">
        <header className="player-header">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="player-logo" />
          ) : (
            <>
              <div className="player-logo-placeholder">{React.createElement('ion-icon', { name: 'notifications' })}</div>
              <div className="player-title">
                <h1>Automation Audio System</h1>
                <span>by minhhan.net</span>
              </div>
            </>
          )}
          <div className={`player-status-dot ${connected ? 'connected' : 'disconnected'}`} title={connected ? 'Đang kết nối' : 'Mất kết nối'} />
        </header>

        <main className="player-main">
          <div className="player-clock">{formatTime(currentTime)}</div>
          <div className="player-date">{formatDate(currentTime)}</div>

          {/* LED VU Meter Simulator Panel */}
          {localStorage.getItem('isSimulatorMode') === 'true' && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginTop: '1.25rem', padding: '0.85rem 1.25rem', background: 'rgba(11, 15, 26, 0.75)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', flexWrap: 'wrap' }}>
            {/* Card 1 LED */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{
                width: '12px', height: '12px', borderRadius: '50%',
                backgroundColor: (bellPlaying?.soundCardId === 'card-1' || bellPlaying?.soundCardId === 'all' || (nowPlaying && !bellPlaying)) ? '#10b981' : '#334155',
                boxShadow: (bellPlaying?.soundCardId === 'card-1' || bellPlaying?.soundCardId === 'all' || (nowPlaying && !bellPlaying)) ? '0 0 12px #10b981' : 'none',
                transition: 'all 0.2s ease'
              }} title="LED Trạng thái Kênh 1" />
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: (bellPlaying?.soundCardId === 'card-1' || bellPlaying?.soundCardId === 'all' || (nowPlaying && !bellPlaying)) ? '#10b981' : 'var(--text-muted)' }}>
                  Kênh âm thanh 1
                </div>
                <div style={{ display: 'flex', gap: '3px', marginTop: '3px' }}>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(bar => {
                    const isActive = (bellPlaying?.soundCardId === 'card-1' || bellPlaying?.soundCardId === 'all' || (nowPlaying && !bellPlaying)) && vuMeterBar >= bar;
                    return (
                      <div key={bar} style={{
                        width: '5px', height: `${bar * 2 + 4}px`, borderRadius: '2px',
                        backgroundColor: isActive ? (bar > 6 ? '#ef4444' : bar > 4 ? '#f59e0b' : '#10b981') : 'rgba(255,255,255,0.1)',
                        transition: 'all 0.1s ease'
                      }} />
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Card 2 LED */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{
                width: '12px', height: '12px', borderRadius: '50%',
                backgroundColor: (bellPlaying?.soundCardId === 'card-2' || bellPlaying?.soundCardId === 'all') ? '#3b82f6' : '#334155',
                boxShadow: (bellPlaying?.soundCardId === 'card-2' || bellPlaying?.soundCardId === 'all') ? '0 0 12px #3b82f6' : 'none',
                transition: 'all 0.2s ease'
              }} title="LED Trạng thái Kênh 2" />
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: (bellPlaying?.soundCardId === 'card-2' || bellPlaying?.soundCardId === 'all') ? '#60a5fa' : 'var(--text-muted)' }}>
                  Kênh âm thanh 2
                </div>
                <div style={{ display: 'flex', gap: '3px', marginTop: '3px' }}>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(bar => {
                    const isActive = (bellPlaying?.soundCardId === 'card-2' || bellPlaying?.soundCardId === 'all') && vuMeterBar >= bar;
                    return (
                      <div key={bar} style={{
                        width: '5px', height: `${bar * 2 + 4}px`, borderRadius: '2px',
                        backgroundColor: isActive ? (bar > 6 ? '#ef4444' : bar > 4 ? '#f59e0b' : '#3b82f6') : 'rgba(255,255,255,0.1)',
                        transition: 'all 0.1s ease'
                      }} />
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
          )}
        </main>

        <footer className="player-footer">
          {liveStreamInfo ? (
            <div className="player-bell-alert" style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.25), rgba(185, 28, 28, 0.35))', borderColor: '#ef4444' }}>
              <span className="bell-icon" style={{ color: '#ef4444' }}>
                {React.createElement('ion-icon', { name: 'radio-outline' })}
              </span>
              <div>
                <div className="bell-type" style={{ color: '#fca5a5', fontWeight: 700 }}>🔴 ĐANG PHÁT TRỰC TIẾP (LIVE STREAM)</div>
                <div className="bell-name">{liveStreamInfo.title}</div>
                <div style={{ fontSize: '0.78rem', color: '#fca5a5', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  {React.createElement('ion-icon', { name: 'hardware-chip-outline' })} 
                  Luồng phát: {liveStreamInfo.soundCardId === 'all' ? 'Tất cả kênh (Phát toàn bộ)' : liveStreamInfo.soundCardId === 'card-1' ? 'Kênh 1' : liveStreamInfo.soundCardId === 'card-2' ? 'Kênh 2' : 'Mặc định hệ thống'}
                </div>
              </div>
            </div>
          ) : bellPlaying ? (
            <div className="player-bell-alert">
              <span className="bell-icon">{React.createElement('ion-icon', { name: 'notifications' })}</span>
              <div>
                <div className="bell-type">{bellPlaying.type || 'Tiếng chuông'}</div>
                <div className="bell-name">{bellPlaying.name}</div>
                <div style={{ fontSize: '0.78rem', color: '#60a5fa', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  {React.createElement('ion-icon', { name: bellPlaying.soundCardId === 'all' ? 'mega-phone-outline' : bellPlaying.soundCardId === 'card-1' || bellPlaying.soundCardId === 'card-2' ? 'headset-outline' : 'hardware-chip-outline' })} 
                  Luồng phát: {bellPlaying.soundCardId === 'all' ? 'Tất cả kênh (Phát toàn bộ)' : bellPlaying.soundCardId === 'card-1' ? 'Kênh 1' : bellPlaying.soundCardId === 'card-2' ? 'Kênh 2' : 'Mặc định hệ thống'}
                </div>
              </div>
            </div>
          ) : nowPlaying ? (
            <div className="player-now-playing">
              <div className="music-bars">
                <span /><span /><span /><span /><span />
              </div>
              <div className="now-playing-info">
                <div className="now-playing-label">Đang phát</div>
                <div className="now-playing-name">{nowPlaying.name}</div>
              </div>
            </div>
          ) : (
            <div className="player-idle">
              <span style={{ marginRight: '8px' }}>{React.createElement('ion-icon', { name: 'hourglass-outline' })}</span> Chờ lịch phát tiếp theo...
            </div>
          )}
        </footer>

        {logoUrl && (
          <div className="player-copyright">
            © {new Date().getFullYear()} minhhan.net — Automation Audio System
          </div>
        )}
      </div>

      <div style={{ position: 'fixed', bottom: '10px', right: '10px', display: 'flex', flexDirection: 'column', gap: '5px', zIndex: 9999, opacity: 0.6, pointerEvents: 'auto' }}>
        <div style={{ fontSize: '10px', color: '#fff', textShadow: '1px 1px 2px #000' }}>Music:</div>
        <audio ref={audioRef} controls style={{ height: '30px', width: '250px' }} onEnded={() => {
          setNowPlaying(null);
          socket?.emit('TRACK_ENDED');
        }} />
        <div style={{ fontSize: '10px', color: '#fff', textShadow: '1px 1px 2px #000', marginTop: '5px' }}>Bell:</div>
        <audio ref={bellRef} controls style={{ height: '30px', width: '250px' }} onEnded={() => {
          setBellPlaying(null);
          if (musicWasPlayingBeforeBell.current && audioRef.current) {
            musicWasPlayingBeforeBell.current = false;
            audioRef.current.play().catch((e) => console.error("Audio playback error:", e));
          }
        }} />
      </div>

      {/* ── YouTube Video Player Pure Fullscreen Overlay (No Header, No Controls, Locked) ── */}
      {youtubeVideoInfo && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          zIndex: 99999, background: '#000', overflow: 'hidden', pointerEvents: 'none'
        }}>
          <iframe
            ref={ytIframeRef}
            src={`https://www.youtube-nocookie.com/embed/${youtubeVideoInfo.videoId}?autoplay=1&controls=0&disablekb=1&fs=0&modestbranding=1&rel=0&iv_load_policy=3&playsinline=1&enablejsapi=1`}
            title={youtubeVideoInfo.title}
            allow="autoplay; encrypted-media"
            style={{ width: '100vw', height: '100vh', border: 'none', pointerEvents: 'none' }}
          />
        </div>
      )}
    </div>
  );
}
