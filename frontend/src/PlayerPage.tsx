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
}

const socket: Socket = io(API_URL);

export default function PlayerPage() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [connected, setConnected] = useState(false);
  const [nowPlaying, setNowPlaying] = useState<AudioEvent | null>(null);
  const [bellPlaying, setBellPlaying] = useState<AudioEvent | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [interacted, setInteracted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const bellRef = useRef<HTMLAudioElement | null>(null);

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

  // Socket events
  useEffect(() => {
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('PLAY_AUDIO', (data: AudioEvent) => {
      setNowPlaying(data);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = `${API_URL}${data.url}`;
        if (data.volume !== undefined) {
          audioRef.current.volume = data.volume;
        }
        audioRef.current.play().catch(() => {});
      }
    });

    socket.on('PLAY_BELL', (data: AudioEvent) => {
      setBellPlaying(data);
      if (bellRef.current) {
        bellRef.current.src = `${API_URL}${data.url}`;
        bellRef.current.play().catch(() => {});
      }
      setTimeout(() => setBellPlaying(null), 10000);
    });

    socket.on('SYNC_STATE', (data: { currentTrack: { path: string; name: string }; volume?: number; isOverride?: boolean }) => {
      if (data && data.currentTrack) {
        const evt: AudioEvent = { url: data.currentTrack.path, name: data.currentTrack.name, volume: data.volume, isOverride: data.isOverride };
        setNowPlaying(evt);
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = `${API_URL}${evt.url}`;
          if (data.volume !== undefined) {
            audioRef.current.volume = data.volume;
          }
          audioRef.current.play().catch(() => {});
        }
      }
    });

    socket.on('STOP_AUDIO', () => {
      setNowPlaying(null);
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
      socket.off('disconnect');
      socket.off('PLAY_AUDIO');
      socket.off('PLAY_BELL');
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
      </div>

      <audio ref={audioRef} />
      <audio ref={bellRef} />
    </div>
  );
}
