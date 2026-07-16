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
}

const socket: Socket = io(API_URL);

const getDeviceId = () => {
  let id = localStorage.getItem('deviceId');
  if (!id) {
    id = (typeof crypto !== 'undefined' && crypto.randomUUID) 
      ? crypto.randomUUID() 
      : Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem('deviceId', id);
  }
  return id;
};

export default function PlayerPage() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [connected, setConnected] = useState(false);
  const [nowPlaying, setNowPlaying] = useState<AudioEvent | null>(null);
  const [bellPlaying, setBellPlaying] = useState<AudioEvent | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [interacted, setInteracted] = useState(false);
  const [isApproved, setIsApproved] = useState<boolean | null>(null);
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

  const schedulePlay = (
    audioEl: HTMLAudioElement | null,
    url: string,
    targetTime: number | undefined,
    volume: number | undefined,
    timeoutRef: React.MutableRefObject<any>
  ) => {
    if (!audioEl) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    audioEl.pause();
    audioEl.src = `${API_URL}${url}`;
    if (volume !== undefined) audioEl.volume = volume;
    audioEl.load();

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

      const evt: AudioEvent = { url: data.currentTrack.path, name: data.currentTrack.name, volume: data.volume, isOverride: data.isOverride, targetTime: data.targetTime };
      setNowPlaying(evt);

      if (data.status === 'paused' && data.pauseOffset !== undefined && audioRef.current) {
        if (audioTimeout.current) clearTimeout(audioTimeout.current);
        audioRef.current.pause();
        audioRef.current.src = `${API_URL}${evt.url}`;
        audioRef.current.currentTime = data.pauseOffset;
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
      // Ignore system volume for the main audio IF a playlist volume is overriding it
      setNowPlaying(prev => {
        if (!prev?.isOverride) {
          if (audioRef.current) audioRef.current.volume = data.volume;
        }
        return prev;
      });
      if (bellRef.current) bellRef.current.volume = data.volume;
    });

    return () => {
      socket.off('connect');
      socket.off('PONG_TIME');
      socket.off('disconnect');
      socket.off('DEVICE_STATUS');
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
      {!interacted && (
        <div className="interaction-overlay">
          <div className="interaction-box">
            <span style={{ fontSize: '3rem' }}>👆</span>
            <h2>Bấm vào màn hình để bắt đầu</h2>
            <p>Trình duyệt yêu cầu tương tác để có thể phát âm thanh tự động.</p>
            <button className="btn btn-primary mt-2" onClick={unlockAudio}>Bắt đầu</button>
          </div>
        </div>
      )}
      
      {isApproved === false && (
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
