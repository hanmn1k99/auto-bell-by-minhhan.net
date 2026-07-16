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
  const [isApproved, setIsApproved] = useState<boolean | null>(null);
  const [isRejected, setIsRejected] = useState(false);
  const [blockedUntil, setBlockedUntil] = useState<Date | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [interacted, setInteracted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const bellRef = useRef<HTMLAudioElement | null>(null);

  const timeOffset = useRef(0);
  const isApprovedRef = useRef(isApproved);
  const audioTimeout = useRef<any>(null);
  const bellTimeoutRef = useRef<any>(null);

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

  const schedulePlay = (
    audioEl: HTMLAudioElement | null,
    url: string,
    targetTime: number | undefined,
    volume: number | undefined,
    timeoutRef: React.MutableRefObject<any>
  ) => {
    if (!audioEl) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    const fullUrl = url.startsWith('http') ? url : `${API_URL}${url}`;
    
    // Chỉ cập nhật src nếu nó thay đổi (tránh lỗi load lại mất tiếng)
    if (!audioEl.src || !audioEl.src.endsWith(url)) {
      audioEl.pause();
      audioEl.src = fullUrl;
      audioEl.load();
    }
    
    if (volume !== undefined) audioEl.volume = volume;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (!targetTime) {
      audioEl.play().catch(() => {});
      return;
    }

    const exactNow = Date.now() + timeOffset.current;
    const delay = targetTime - exactNow;

    if (delay > 0) {
      timeoutRef.current = setTimeout(() => {
        audioEl.currentTime = 0;
        audioEl.play().catch(() => {});
      }, delay);
    } else {
      const overDue = (exactNow - targetTime) / 1000;
      audioEl.currentTime = overDue;
      audioEl.play().catch(() => {});
    }
  };

  // Socket events
  useEffect(() => {
    const registerDevice = () => {
      setConnected(true);
      socket.emit('PING_TIME', Date.now());
      socket.emit('REGISTER_DEVICE', { deviceId: getDeviceId() });
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

    socket.on('PLAY_AUDIO', (data: AudioEvent) => {
      if (!isApprovedRef.current) return;
      setNowPlaying(data);
      schedulePlay(audioRef.current, data.url, data.targetTime, data.volume, audioTimeout);
    });

    socket.on('PLAY_BELL', (data: AudioEvent) => {
      if (!isApprovedRef.current) return;
      setBellPlaying(data);
      schedulePlay(bellRef.current, data.url, data.targetTime, undefined, bellTimeoutRef);
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
        pauseOffset: data.pauseOffset
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
        schedulePlay(audioRef.current, evt.url, evt.targetTime, evt.volume, audioTimeout);
      }
    });

    socket.on('PAUSE_AUDIO', () => {
      if (audioTimeout.current) clearTimeout(audioTimeout.current);
      if (audioRef.current) audioRef.current.pause();
    });

    socket.on('STOP_AUDIO', () => {
      setNowPlaying(null);
      if (audioTimeout.current) clearTimeout(audioTimeout.current);
      if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ''; }
    });

    socket.on('SET_VOLUME', (data: { volume: number }) => {
      setNowPlaying(prev => prev ? { ...prev, volume: data.volume } : prev);
      if (audioRef.current) audioRef.current.volume = data.volume;
      if (bellRef.current) bellRef.current.volume = data.volume;
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
    if (audioRef.current) {
      if (!nowPlaying && !bellPlaying) {
        audioRef.current.play().catch(() => {});
        audioRef.current.pause();
      } else {
        // Nếu đã có nhạc từ SYNC_STATE hoặc sự kiện trước đó, phát luôn!
        audioRef.current.play().catch(() => {});
      }
    }
  };

  return (
    <div className="player-root" onClick={!interacted ? unlockAudio : undefined}>
      {blockedUntil && (
        <div className="interaction-overlay">
          <div className="interaction-box" style={{ border: '1px solid #ef4444' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🛑</div>
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
          <div className="interaction-box">
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚫</div>
            <h2>Quyền truy cập bị từ chối</h2>
            <p style={{ marginTop: '0.5rem', marginBottom: '1.5rem', opacity: 0.8 }}>
              Thiết bị của bạn đã bị từ chối kết nối.
            </p>
            <button className="btn btn-primary" onClick={() => window.location.reload()}>Xin cấp lại quyền</button>
          </div>
        </div>
      )}
      {!blockedUntil && !isRejected && !interacted && (
        <div className="interaction-overlay">
          <div className="interaction-box">
            <span style={{ fontSize: '3rem' }}>👆</span>
            <h2>Bấm vào màn hình để bắt đầu</h2>
            <p>Trình duyệt yêu cầu tương tác để có thể phát âm thanh tự động.</p>
            <button className="btn btn-primary mt-2" onClick={unlockAudio}>Bắt đầu</button>
          </div>
        </div>
      )}
      
      {!blockedUntil && isApproved === false && (
        <div className="interaction-overlay" style={{ zIndex: 9999, background: 'rgba(11, 15, 26, 0.95)' }}>
          <div className="interaction-box" style={{ border: '1px solid #ef4444' }}>
            <span style={{ fontSize: '3rem' }}>🔒</span>
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
              <div className="player-logo-placeholder">🔔</div>
              <div className="player-title">
                <h1>AutoBells</h1>
                <span>by minhhan.net</span>
              </div>
            </>
          )}
          <div className={`player-status-dot ${connected ? 'connected' : 'disconnected'}`} title={connected ? 'Đang kết nối' : 'Mất kết nối'} />
        </header>

        <main className="player-main">
          <div className="player-clock">{formatTime(currentTime)}</div>
          <div className="player-date">{formatDate(currentTime)}</div>
        </main>

        <footer className="player-footer">
          {bellPlaying ? (
            <div className="player-bell-alert">
              <span className="bell-icon">🔔</span>
              <div>
                <div className="bell-type">{bellPlaying.type === 'PRIMARY' ? 'Tiểu học' : 'Trung học'} — Tiếng chuông</div>
                <div className="bell-name">{bellPlaying.name}</div>
              </div>
            </div>
          ) : nowPlaying ? (
            <div className="player-now-playing">
              <div className={`vinyl-record ${nowPlaying.status === 'paused' ? 'paused' : ''}`}></div>
              <div className="now-playing-info">
                <div className="now-playing-label">Đang phát</div>
                <div className="now-playing-name">{nowPlaying.name}</div>
              </div>
            </div>
          ) : (
            <div className="player-idle">
              <span>⏳</span> Chờ lịch phát tiếp theo...
            </div>
          )}
        </footer>

        {logoUrl && (
          <div style={{ textAlign: 'center', fontSize: '0.8rem', color: '#64748b', marginTop: 'auto', paddingTop: '1rem' }}>
            AutoBells © {new Date().getFullYear()} minhhan.net
          </div>
        )}
      </div>

      <audio ref={audioRef} onEnded={() => {
        setNowPlaying(null);
        socket?.emit('TRACK_ENDED');
      }} />
      <audio ref={bellRef} onEnded={() => {
        setBellPlaying(null);
      }} />
    </div>
  );
}
