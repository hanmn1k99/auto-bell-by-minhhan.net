import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_URL } from './api';
import './player.css';

interface AudioEvent {
  url: string;
  name: string;
  type?: string;
  manual?: boolean;
}

const socket: Socket = io(API_URL);

export default function PlayerPage() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [connected, setConnected] = useState(false);
  const [nowPlaying, setNowPlaying] = useState<AudioEvent | null>(null);
  const [bellPlaying, setBellPlaying] = useState<AudioEvent | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
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

    socket.on('STOP_AUDIO', () => {
      setNowPlaying(null);
      if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ''; }
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('PLAY_AUDIO');
      socket.off('PLAY_BELL');
      socket.off('STOP_AUDIO');
    };
  }, []);

  const formatTime = (d: Date) => d.toLocaleTimeString('vi-VN', { hour12: false });
  const formatDate = (d: Date) => d.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="player-root">
      <div className="player-bg-animated" />
      <div className="player-container">
        <header className="player-header">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="player-logo" />
          ) : (
            <div className="player-logo-placeholder">🔔</div>
          )}
          <div className="player-title">
            <h1>AutoBells</h1>
            <span>by minhhan.net</span>
          </div>
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
