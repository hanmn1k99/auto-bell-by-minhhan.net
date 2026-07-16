import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { API_URL } from './api';
import { io, Socket } from 'socket.io-client';
import './admin.css';
// ── Types ──────────────────────────────
interface AudioFile { id: number; name: string; filename: string; path: string; createdAt: string; }
interface PlaylistItem { id: number; order: number; audioFile: AudioFile; }
interface Playlist {
  id: number;
  name: string;
  description?: string;
  volume: number;
  items: PlaylistItem[];
}
interface Schedule { id: number; name: string; startTime: string; endTime: string; playlistId: number; playlist: Playlist; isActive: boolean; daysOfWeek: string; }
interface BellConfig { id: number; type: string; time: string; audioFileId: number; audioFile: AudioFile; isActive: boolean; daysOfWeek: string; }

const DAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const ALL_WEEKDAYS = '1,2,3,4,5';
const ALL_DAYS = '0,1,2,3,4,5,6';

function DayPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const selected = value.split(',').map(Number).filter(n => !isNaN(n));
  const toggle = (d: number) => {
    const next = selected.includes(d) ? selected.filter(x => x !== d) : [...selected, d].sort();
    onChange(next.join(','));
  };
  return (
    <div className="day-picker">
      {DAYS.map((day, i) => (
        <button key={i} type="button" className={`day-btn ${selected.includes(i) ? 'active' : ''}`} onClick={() => toggle(i)}>
          {day}
        </button>
      ))}
    </div>
  );
}

// ── Admin Page ─────────────────────────
export default function AdminPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'dashboard' | 'files' | 'playlists' | 'schedules' | 'bells' | 'devices' | 'settings'>('dashboard');

  // Data
  const [files, setFiles] = useState<AudioFile[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [bells, setBells] = useState<BellConfig[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [msg, setMsg] = useState<{ text: string; type: 'ok' | 'err' } | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [volume, setVolume] = useState<number>(1.0);

  const notify = (text: string, type: 'ok' | 'err' = 'ok') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 3000);
  };

  const [dialog, setDialog] = useState<{ 
    message: string; 
    onConfirm: (val?: string) => void; 
    onCancel: () => void; 
    type: 'confirm' | 'alert' | 'prompt';
    defaultValue?: string;
  } | null>(null);

  const customConfirm = (message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setDialog({
        message, type: 'confirm',
        onConfirm: () => { setDialog(null); resolve(true); },
        onCancel: () => { setDialog(null); resolve(false); }
      });
    });
  };

  const customAlert = (message: string) => {
    setDialog({
      message, type: 'alert',
      onConfirm: () => setDialog(null),
      onCancel: () => setDialog(null)
    });
  };

  const customPrompt = (message: string, defaultValue: string = ''): Promise<string | null> => {
    return new Promise((resolve) => {
      setDialog({
        message, type: 'prompt', defaultValue,
        onConfirm: (val?: string) => { setDialog(null); resolve(val || null); },
        onCancel: () => { setDialog(null); resolve(null); }
      });
    });
  };

  const MiniPlayer = ({ src }: { src: string }) => {
    const [playing, setPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);
    
    const toggle = () => {
      if (!audioRef.current) return;
      if (playing) audioRef.current.pause();
      else audioRef.current.play();
    };
    
    return (
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button className="btn btn-outline btn-xs" style={{ width: '32px', height: '32px', padding: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={toggle} title="Nghe thử">
          {playing ? '⏸' : '▶️'}
        </button>
        <audio 
          ref={audioRef} 
          src={src} 
          onPlay={() => setPlaying(true)} 
          onPause={() => setPlaying(false)} 
          onEnded={() => setPlaying(false)}
          style={{ display: 'none' }} 
        />
      </div>
    );
  };

  const loadAll = async () => {
    try {
      const [f, p, s, b, a, state] = await Promise.all([
        api.get('/api/files'), api.get('/api/playlists'),
        api.get('/api/schedules'), api.get('/api/schedules/bells'),
        api.get('/api/files/assets/info'), api.get('/api/admin/state')
      ]);
      setFiles(f.data); setPlaylists(p.data); setSchedules(s.data);
      setBells(b.data); 
      if (a.data.logo) setLogoUrl(`${API_URL}${a.data.logo}`);
      if (state.data.volume !== undefined) setVolume(state.data.volume);
    } catch {}
  };

  const [nowPlaying, setNowPlaying] = useState<{name: string, url: string, isOverride?: boolean, status?: string, targetTime?: number | null, pauseOffset?: number | null, upNext?: {name: string, path: string}[]} | null>(null);
  const [bellPlaying, setBellPlaying] = useState<{name: string, type: string} | null>(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);

  const [mediaDuration, setMediaDuration] = useState(0);
  const [mediaCurrentTime, setMediaCurrentTime] = useState(0);

  // Sync state media time
  useEffect(() => {
    if (nowPlaying?.url) {
      const audio = new Audio(`${API_URL}${nowPlaying.url}`);
      audio.onloadedmetadata = () => setMediaDuration(audio.duration);
    } else {
      setMediaDuration(0);
    }
  }, [nowPlaying?.url]);

  useEffect(() => {
    const t = setInterval(() => {
      if (!nowPlaying) {
        setMediaCurrentTime(0);
        return;
      }
      if (nowPlaying.status === 'paused' && nowPlaying.pauseOffset != null) {
        if (!isSeeking) setMediaCurrentTime(nowPlaying.pauseOffset);
      } else if (nowPlaying.status === 'playing' && nowPlaying.targetTime) {
        const elapsed = (Date.now() - nowPlaying.targetTime) / 1000;
        if (!isSeeking) setMediaCurrentTime(Math.max(0, Math.min(elapsed, mediaDuration || elapsed)));
      }
    }, 1000);
    return () => clearInterval(t);
  }, [nowPlaying, mediaDuration, isSeeking]);

  useEffect(() => { 
    document.title = 'Dashboard - AutoBells by minhhan.net';
    loadAll(); 

    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const socket: Socket = io({ auth: { token } });
    socket.on('SYNC_STATE', (data: any) => {
      if (data.currentTrack && data.status !== 'stopped') {
        setNowPlaying({ 
          name: data.currentTrack.name, 
          url: data.currentTrack.path, 
          isOverride: data.isOverride,
          status: data.status,
          targetTime: data.targetTime,
          pauseOffset: data.pauseOffset,
          upNext: data.upNext || []
        });
      } else {
        setNowPlaying(null);
      }
      if (data.volume !== undefined) setVolume(data.volume);
    });
    socket.on('PLAY_AUDIO', (data: any) => setNowPlaying(prev => ({
      ...prev, name: data.name, url: data.url, isOverride: data.isOverride, status: 'playing', targetTime: data.targetTime, upNext: prev?.upNext || []
    })));
    socket.on('STOP_AUDIO', () => setNowPlaying(null));
    socket.on('PAUSE_AUDIO', () => {
      setNowPlaying(prev => prev ? { ...prev, status: 'paused', pauseOffset: mediaCurrentTime } : null);
    });
    socket.on('PLAY_BELL', (data: any) => {
      setBellPlaying(data);
      setTimeout(() => setBellPlaying(null), 10000); // Ẩn chuông báo sau 10s trên admin
    });
    socket.on('SET_VOLUME', (data: any) => setVolume(data.volume));

    socket.on('DEVICES_UPDATED', () => {
      fetchDevices();
    });

    return () => { socket.disconnect(); };
  }, []);

  const logout = () => { 
    sessionStorage.removeItem('token'); 
    localStorage.removeItem('token');
    localStorage.removeItem('rememberMe');
    navigate('/login'); 
  };

  // Idle timeout (30 phút)
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    const resetTimer = () => {
      clearTimeout(timeoutId);
      const isRemember = localStorage.getItem('rememberMe') === 'true';
      const timeoutMs = isRemember ? 3 * 24 * 60 * 60 * 1000 : 30 * 60 * 1000;
      
      timeoutId = setTimeout(() => {
        sessionStorage.removeItem('token');
        localStorage.removeItem('token');
        localStorage.removeItem('rememberMe');
        navigate('/login');
        customAlert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      }, timeoutMs);
    };

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(e => window.addEventListener(e, resetTimer));
    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      events.forEach(e => window.removeEventListener(e, resetTimer));
    };
  }, [navigate]);

  // ── Dashboard ───────────────────────
  const handleVolumeChange = async (val: number) => {
    setVolume(val);
    try { await api.post('/api/admin/volume', { volume: val }); } catch {}
  };

  const playManual = async (type: 'file' | 'playlist', id: number) => {
    try {
      if (type === 'file') {
        await api.post(`/api/admin/play-file/${id}`);
        notify('Đã phát tệp âm thanh');
      } else if (type === 'playlist') {
        await api.post(`/api/admin/play-playlist/${id}`);
        notify('Đã phát playlist');
      }
    } catch {
      notify('Lỗi phát thủ công', 'err');
    }
  };

  const queueManual = async (type: 'file' | 'playlist', id: number) => {
    try {
      if (type === 'file') {
        await api.post(`/api/admin/queue-file/${id}`);
        notify('Đã thêm tệp vào hàng đợi');
      } else if (type === 'playlist') {
        await api.post(`/api/admin/queue-playlist/${id}`);
        notify('Đã thêm playlist vào hàng đợi');
      }
    } catch {
      notify('Lỗi thêm hàng đợi', 'err');
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    setMediaCurrentTime(time);
    api.post('/api/admin/seek', { time }).catch(() => {});
  };



  const fetchDevices = async () => {
    try {
      const res = await api.get('/api/devices');
      setDevices(res.data);
    } catch {}
  };

  useEffect(() => {
    if (tab === 'devices') {
      fetchDevices();
    }
  }, [tab]);

  const updateDevice = async (id: string, updates: any) => {
    try {
      await api.put(`/api/devices/${id}`, updates);
      fetchDevices();
    } catch {}
  };

  const deleteDevice = async (id: string) => {
    if (!(await customConfirm('Bạn có chắc chắn muốn xóa và kick thiết bị này?'))) return;
    try {
      await api.delete(`/api/devices/${id}`);
      fetchDevices();
    } catch {}
  };

  const Dashboard = () => (
    <div className="admin-section">
      <h2>Bảng điều khiển</h2>

      {bellPlaying && (
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--accent)', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem', animation: 'pulse 2s infinite' }}>
          <div style={{ fontSize: '2.5rem' }}>{React.createElement('ion-icon', { name: 'notifications' })}</div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--accent)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>
              Đang đổ chuông trực tiếp
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#f8fafc', marginTop: '0.25rem' }}>
              [Chuông] {bellPlaying.name}
            </div>
          </div>
        </div>
      )}

      <div className="dashboard-grid">
        <div className="dashboard-main">
          <div className="stat-grid">
            <div className="stat-card"><div className="stat-num">{files.length}</div><div className="stat-label">Lưu trữ</div></div>
            <div className="stat-card"><div className="stat-num">{playlists.length}</div><div className="stat-label">Playlist</div></div>
            <div className="stat-card"><div className="stat-num">{schedules.filter(s => s.isActive).length}</div><div className="stat-label">Lịch đang bật</div></div>
            <div className="stat-card"><div className="stat-num">{bells.filter(b => b.isActive).length}</div><div className="stat-label">Chuông đang bật</div></div>
          </div>

          <div className="dashboard-controls" style={{ marginTop: '2rem' }}>
            <h3>Phát Playlist</h3>
            {playlists.length === 0 && <div className="empty-state" style={{ padding: '1rem' }}>Chưa có playlist nào</div>}
            <div className="play-card-container">
              {playlists.map(p => (
                <div className="play-card" key={p.id}>
                  <div className="play-card-title" title={p.name}>{p.name}</div>
                  <div className="play-card-meta">{p.items?.length ?? 0} bài hát</div>
                  <div className="dashboard-card-actions">
                    <button className="btn btn-primary btn-sm" onClick={() => playManual('playlist', p.id)}>
                      {React.createElement('ion-icon', { name: 'play' })} Phát
                    </button>
                    <button className="btn btn-outline btn-sm" onClick={() => queueManual('playlist', p.id)} title="Thêm vào hàng đợi">
                      {React.createElement('ion-icon', { name: 'add' })} Thêm
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <h3 style={{ marginTop: '1.5rem' }}>Phát Tệp Âm Thanh</h3>
            {files.length === 0 && <div className="empty-state" style={{ padding: '1rem' }}>Chưa có tệp nào</div>}
            <div className="play-card-container">
              {files.map(f => (
                <div className="play-card" key={f.id}>
                  <div className="play-card-title" title={f.name}>{f.name}</div>
                  <div className="dashboard-card-actions">
                    <button className="btn btn-primary btn-sm" onClick={() => playManual('file', f.id)}>
                      {React.createElement('ion-icon', { name: 'play' })} Phát
                    </button>
                    <button className="btn btn-outline btn-sm" onClick={() => queueManual('file', f.id)} title="Thêm vào hàng đợi">
                      {React.createElement('ion-icon', { name: 'add' })} Thêm
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const RightSidebar = () => (
    <>
      <div className="media-player-widget">
        <div className="media-cover">
          {nowPlaying && (nowPlaying.status === 'playing' || nowPlaying.status === 'paused') ? (
            <div className={`admin-vinyl-record ${nowPlaying.status === 'paused' ? 'paused' : ''}`}></div>
          ) : <span>{React.createElement('ion-icon', { name: 'musical-notes', style: {fontSize: '2rem'} })}</span>}
        </div>
        <div className="media-info">
          <div className="media-status">{nowPlaying ? (nowPlaying.status === 'playing' ? 'ĐANG PHÁT' : 'TẠM DỪNG') : 'SẴN SÀNG'}</div>
          <div className="media-title" title={nowPlaying?.name}>{nowPlaying ? nowPlaying.name : 'Chưa có bài hát nào'}</div>
          {nowPlaying?.isOverride && <div className="media-override">* Đang ghi đè âm lượng</div>}
        </div>
        
        <div className="media-progress">
          <span className="time-current">{formatTime(mediaCurrentTime)}</span>
          <input type="range" className="time-slider" min="0" max={mediaDuration || 100} value={mediaCurrentTime} 
            onMouseDown={() => setIsSeeking(true)}
            onTouchStart={() => setIsSeeking(true)}
            onMouseUp={(e) => { setIsSeeking(false); handleSeek(e as any); }}
            onTouchEnd={(e) => { setIsSeeking(false); handleSeek(e as any); }}
            onChange={(e) => setMediaCurrentTime(Number(e.target.value))} 
            disabled={!nowPlaying} />
          <span className="time-total">{formatTime(mediaDuration)}</span>
        </div>

        <div className="media-controls">
          <button className="btn-icon" onClick={() => api.post('/api/admin/prev')} disabled={!nowPlaying} title="Bài trước">
            {React.createElement('ion-icon', { name: 'play-skip-back' })}
          </button>
          {nowPlaying?.status === 'playing' ? (
            <button className="btn-icon play-btn" onClick={() => api.post('/api/admin/pause')} title="Tạm dừng">
              {React.createElement('ion-icon', { name: 'pause' })}
            </button>
          ) : (
            <button className="btn-icon play-btn" onClick={() => api.post('/api/admin/resume')} disabled={!nowPlaying} title="Phát tiếp">
              {React.createElement('ion-icon', { name: 'play' })}
            </button>
          )}
          <button className="btn-icon" onClick={() => api.post('/api/admin/next')} disabled={!nowPlaying} title="Bài tiếp theo">
            {React.createElement('ion-icon', { name: 'play-skip-forward' })}
          </button>
          <button className="btn-icon btn-stop" onClick={() => api.post('/api/admin/stop')} disabled={!nowPlaying} title="Dừng hẳn">
            {React.createElement('ion-icon', { name: 'square' })}
          </button>
        </div>

        <div className="media-volume">
          <span title="Âm lượng hệ thống">{React.createElement('ion-icon', { name: 'volume-low' })}</span>
          <input type="range" min="0" max="1" step="0.01" value={volume} onChange={(e) => handleVolumeChange(Number(e.target.value))} />
          <span>{React.createElement('ion-icon', { name: 'volume-high' })} {Math.round(volume * 100)}%</span>
        </div>
      </div>

      <div className="up-next-widget">
        <h3>Phát tiếp theo</h3>
        {!nowPlaying || !nowPlaying.upNext || nowPlaying.upNext.length === 0 ? (
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Không có bài hát nào chờ</div>
        ) : (
          <div className="up-next-list">
            {nowPlaying.upNext.slice(0, 5).map((track, i) => (
              <div className="up-next-item" key={i}>
                <span className="idx">{i + 1}.</span>
                <span className="name" title={track.name}>{track.name}</span>
              </div>
            ))}
            {nowPlaying.upNext.length > 5 && (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.5rem' }}>
                + {nowPlaying.upNext.length - 5} bài nữa...
              </div>
            )}
          </div>
        )}
      </div>


    </>
  );

  const Devices = () => {
    const approvedDevices = devices.filter(d => d.isApproved);
    const pendingDevices = devices.filter(d => !d.isApproved);

    const renderDeviceCard = (d: any) => (
      <div key={d.id} style={{
        background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.25rem',
        display: 'flex', flexDirection: 'column', gap: '0.75rem', position: 'relative', overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '3px', background: d.isApproved ? 'var(--success)' : 'var(--warning)' }}></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: '1.1rem', color: '#fff' }}>{d.name}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: '0.2rem' }}>ID: {d.id.substring(0,8)}...</div>
          </div>
          <div style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: d.isApproved ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', color: d.isApproved ? 'var(--success)' : 'var(--warning)', fontWeight: 500 }}>
            {d.isApproved ? 'Đã duyệt' : 'Chờ duyệt'}
          </div>
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.3rem', marginTop: '0.25rem' }}>
          <div><span style={{opacity: 0.6}}>IP Public:</span> <span style={{fontFamily: 'monospace'}}>{d.ipAddress || '-'}</span></div>
          {d.browserInfo && <div><span style={{opacity: 0.6}}>Trình duyệt:</span> {d.browserInfo}</div>}
          <div><span style={{opacity: 0.6}}>Hoạt động:</span> {new Date(d.lastSeen).toLocaleString('vi-VN')}</div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
          <button className="btn btn-ghost btn-xs" style={{flex: 1}} onClick={async () => {
            const newName = await customPrompt('Nhập tên thiết bị mới:', d.name);
            if (newName && newName !== d.name) updateDevice(d.id, { name: newName });
          }}>✎ Đổi tên</button>
          <button className="btn btn-ghost btn-xs" style={{flex: 1, color: d.isApproved ? 'var(--warning)' : 'var(--success)'}} onClick={() => updateDevice(d.id, { isApproved: !d.isApproved })}>
            {d.isApproved ? '🔒 Khóa' : '✓ Duyệt'}
          </button>
          <button className="btn btn-danger-ghost btn-xs" style={{flex: 1}} onClick={() => deleteDevice(d.id)}>
            {!d.isApproved ? '🚫 Từ chối' : '🗑 Xóa'}
          </button>
        </div>
      </div>
    );

    return (
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2>Quản lý thiết bị kết nối</h2>
          <button className="btn btn-primary btn-sm" onClick={fetchDevices}>Tải lại</button>
        </div>

        {pendingDevices.length > 0 && (
          <div style={{ marginBottom: '3rem' }}>
            <h3 style={{ color: 'var(--warning)', marginBottom: '1rem', borderBottom: '1px solid rgba(245,158,11,0.2)', paddingBottom: '0.5rem' }}>
              ⚠️ Thiết bị chờ phê duyệt ({pendingDevices.length})
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
              {pendingDevices.map(d => renderDeviceCard(d))}
            </div>
          </div>
        )}

        <div>
          <h3 style={{ color: 'var(--text)', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
            Thiết bị đã phê duyệt ({approvedDevices.length})
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
            {approvedDevices.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem', gridColumn: '1 / -1', border: '1px dashed var(--border)', borderRadius: '12px' }}>
                Chưa có thiết bị nào được phê duyệt
              </div>
            ) : approvedDevices.map(d => renderDeviceCard(d))}
          </div>
        </div>
      </div>
    );
  };

  // ── Files ────────────────────────────
  const [fileUploading, setFileUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const Files = () => {
    const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const filesToUpload = Array.from(e.target.files || []);
      if (filesToUpload.length === 0) return;
      setFileUploading(true);
      
      let successCount = 0;
      let errorCount = 0;
      const BATCH_SIZE = 50; // Trùng với limit của backend

      for (let i = 0; i < filesToUpload.length; i += BATCH_SIZE) {
        const batch = filesToUpload.slice(i, i + BATCH_SIZE);
        setUploadProgress(`Đang tải ${Math.min(i + BATCH_SIZE, filesToUpload.length)}/${filesToUpload.length}...`);
        
        const fd = new FormData();
        batch.forEach(f => fd.append('audio', f));
        
        try {
          const res = await api.post('/api/files/upload', fd);
          successCount += res.data.files?.length || batch.length;
        } catch {
          errorCount += batch.length;
        }
      }

      await loadAll();
      setFileUploading(false);
      setUploadProgress('');
      notify(`Tải xong ${successCount} file. ${errorCount ? `Lỗi ${errorCount} file.` : ''}`);
    };
    const del = async (id: number) => {
      if (!(await customConfirm('Xóa tệp này?'))) return;
      try { await api.delete(`/api/files/${id}`); await loadAll(); notify('Đã xóa'); }
      catch { notify('Lỗi xóa tệp', 'err'); }
    };
    
    const syncFiles = async () => {
      try {
        const res = await api.post('/api/files/sync');
        notify(`Đồng bộ xong! Đã nạp ${res.data.addedCount} file mới từ thư mục.`);
        await loadAll();
      } catch {
        notify('Lỗi đồng bộ', 'err');
      }
    };
    
    const renameFile = async (id: number, currentName: string) => {
      const newName = await customPrompt('Nhập tên mới cho file:', currentName);
      if (!newName || newName === currentName) return;
      try {
        await api.put(`/api/files/${id}`, { name: newName });
        notify('Đã đổi tên file');
        await loadAll();
      } catch {
        notify('Đổi tên thất bại', 'err');
      }
    };
    const uploadAsset = async (type: 'logo' | 'favicon', e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files?.length) return;
      const fd = new FormData();
      fd.append(type, e.target.files[0]);
      try {
        const res = await api.post(`/api/files/upload-${type}`, fd);
        if (type === 'logo') setLogoUrl(`${API_URL}${res.data.url}?t=${Date.now()}`);
        notify(`Đã cập nhật ${type}!`);
      } catch { notify('Lỗi upload', 'err'); }
    };

    const deleteAsset = async (type: 'logo' | 'favicon') => {
      if (!(await customConfirm(`Xóa ${type}?`))) return;
      try {
        await api.delete(`/api/files/assets/${type}`);
        notify(`Đã xóa ${type}!`);
        if (type === 'logo') setLogoUrl(null);
      } catch {
        notify(`Lỗi xóa ${type}`, 'err');
      }
    };

    return (
      <div className="admin-section">
        <h2>Quản lý tệp</h2>

        <div className="card mb-4">
          <h3>Tài nguyên hình ảnh (Assets)</h3>
          <div className="asset-grid">
            <div className="asset-item">
              <div className="asset-preview">
                {logoUrl ? <img src={logoUrl} alt="logo" /> : <span>Chưa có logo</span>}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                <label className="btn btn-outline btn-sm" style={{flex: 1, justifyContent: 'center'}}>
                  {React.createElement('ion-icon', { name: 'image-outline' })} {logoUrl ? 'Thay' : 'Tải lên'} logo
                  <input type="file" accept="image/*" hidden onChange={e => uploadAsset('logo', e)} />
                </label>
                <button className="btn btn-danger-ghost btn-sm" onClick={() => deleteAsset('logo')} title="Xóa logo">
                  {React.createElement('ion-icon', { name: 'trash-outline' })}
                </button>
              </div>
            </div>
            <div className="asset-item">
              <div className="asset-preview favicon-preview">
                {React.createElement('ion-icon', { name: 'globe-outline' })}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                <label className="btn btn-outline btn-sm" style={{flex: 1, justifyContent: 'center'}}>
                  {React.createElement('ion-icon', { name: 'image-outline' })} Thay favicon
                  <input type="file" accept="image/*,.ico" hidden onChange={e => uploadAsset('favicon', e)} />
                </label>
                <button className="btn btn-danger-ghost btn-sm" onClick={() => deleteAsset('favicon')} title="Xóa favicon">
                  {React.createElement('ion-icon', { name: 'trash-outline' })}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Kho dữ liệu ({files.length})</h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-outline btn-sm" onClick={syncFiles}>
                🔄 Đồng bộ
              </button>
              <label className={`btn btn-primary btn-sm ${fileUploading ? 'disabled' : ''}`}>
                {fileUploading ? `⏳ ${uploadProgress}` : '⬆ Tải lên'}
                <input type="file" accept="audio/*" multiple hidden onChange={upload} disabled={fileUploading} />
              </label>
            </div>
          </div>
          <div className="file-list">
            {files.length === 0 && <div className="empty-state">Chưa có tệp nào. Hãy tải lên!</div>}
            {files.map(f => (
              <div key={f.id} className="file-item">
                <span className="file-icon">🎵</span>
                <div className="file-info">
                  <div className="file-name" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {f.name}
                    <button className="btn btn-ghost btn-xs" onClick={() => renameFile(f.id, f.name)} title="Đổi tên" style={{ padding: '2px 4px' }}>✎</button>
                  </div>
                  <div className="file-meta">{f.filename}</div>
                </div>
                <MiniPlayer src={`${API_URL}${f.path}`} />
                <button className="btn btn-icon btn-danger-ghost" onClick={() => del(f.id)} title="Xóa">🗑</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ── Playlists ────────────────────────
  const [newPLName, setNewPLName] = useState('');
  const [selectedPL, setSelectedPL] = useState<Playlist | null>(null);
  const [addFileId, setAddFileId] = useState('');

  const Playlists = () => {
    const createPL = async () => {
      if (!newPLName.trim()) return;
      try { await api.post('/api/playlists', { name: newPLName }); setNewPLName(''); await loadAll(); notify('Tạo playlist thành công!'); }
      catch { notify('Lỗi tạo playlist', 'err'); }
    };
    const deletePlaylist = async (id: number) => {
      if (!(await customConfirm('Xóa playlist này?'))) return;
      try { await api.delete(`/api/playlists/${id}`); if (selectedPL?.id === id) setSelectedPL(null); await loadAll(); notify('Đã xóa'); }
      catch { notify('Lỗi xóa', 'err'); }
    };
    const addItem = async (plId: number) => {
      if (!addFileId) return;
      try { await api.post(`/api/playlists/${plId}/items`, { audioFileId: Number(addFileId) }); setAddFileId(''); await loadAll(); notify('Đã thêm bài!'); }
      catch { notify('Lỗi thêm bài', 'err'); }
    };
    const removeItem = async (plId: number, itemId: number) => {
      try { await api.delete(`/api/playlists/${plId}/items/${itemId}`); await loadAll(); }
      catch { notify('Lỗi xóa bài', 'err'); }
    };

    return (
      <div className="admin-section">
        <h2>Quản lý Playlist</h2>
        <div className="two-col">
          <div className="col-left">
            <div className="card mb-3">
              <h3>Tạo playlist mới</h3>
              <div className="input-row">
                <input className="input" value={newPLName} onChange={e => setNewPLName(e.target.value)} placeholder="Tên playlist..." onKeyDown={e => e.key === 'Enter' && createPL()} />
                <button className="btn btn-primary btn-sm" onClick={createPL}>Tạo</button>
              </div>
            </div>
            <div className="card">
              <h3>Danh sách ({playlists.length})</h3>
              {playlists.length === 0 && <div className="empty-state">Chưa có playlist</div>}
              {playlists.map(pl => (
                <div key={pl.id} className={`playlist-item ${selectedPL?.id === pl.id ? 'active' : ''}`} onClick={() => setSelectedPL(pl)}>
                  <div>
                    <div className="playlist-name">{pl.name}</div>
                    <div className="playlist-meta">{pl.items?.length ?? 0} bài</div>
                  </div>
                  <button className="btn btn-icon btn-danger-ghost" onClick={e => { e.stopPropagation(); deletePlaylist(pl.id); }}>🗑</button>
                </div>
              ))}
            </div>
          </div>
          <div className="col-right">
            {selectedPL ? (() => {
              const pl = playlists.find(p => p.id === selectedPL.id) || selectedPL;
              return (
                <div className="card">
                  <h3>🎵 {pl.name}</h3>
                  <div className="input-row mb-3" style={{ alignItems: 'center', gap: '1rem' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Âm lượng:</span>
                    <input 
                      type="range" min="0" max="1" step="0.05" 
                      value={pl.volume ?? 1.0} 
                      onChange={async (e) => {
                        const newVol = Number(e.target.value);
                        try {
                          await api.put(`/api/playlists/${pl.id}`, { name: pl.name, description: pl.description, volume: newVol });
                          await loadAll();
                        } catch {}
                      }} 
                      style={{ flex: 1 }} 
                    />
                    <span style={{ width: '40px', fontSize: '0.85rem' }}>{Math.round((pl.volume ?? 1.0) * 100)}%</span>
                  </div>
                  <div className="input-row mb-3">
                    <select className="input" value={addFileId} onChange={e => setAddFileId(e.target.value)}>
                      <option value="">Chọn bài để thêm...</option>
                      {files.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                    <button className="btn btn-primary btn-sm" onClick={() => addItem(pl.id)}>Thêm</button>
                  </div>
                  {pl.items?.length === 0 && <div className="empty-state">Chưa có bài nào trong playlist</div>}
                  {pl.items?.map((item, i) => (
                    <div key={item.id} className="pl-item-row">
                      <span className="pl-item-num">{i + 1}</span>
                      <span className="pl-item-name">{item.audioFile.name}</span>
                      <button className="btn btn-icon btn-danger-ghost" onClick={() => removeItem(pl.id, item.id)}>✕</button>
                    </div>
                  ))}
                </div>
              );
            })() : (
              <div className="card center-content"><div className="empty-state">← Chọn một playlist để chỉnh sửa</div></div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ── Schedules ─────────────────────────
  const [schForm, setSchForm] = useState({ name: '', startTime: '07:00', endTime: '08:00', playlistId: '', daysOfWeek: ALL_WEEKDAYS, isActive: true });
  const [editSch, setEditSch] = useState<Schedule | null>(null);

  const Schedules = () => {
    const save = async () => {
      if (!schForm.name || !schForm.playlistId) return notify('Điền đầy đủ thông tin', 'err');
      try {
        if (editSch) { await api.put(`/api/schedules/${editSch.id}`, { ...schForm, playlistId: Number(schForm.playlistId) }); setEditSch(null); }
        else { await api.post('/api/schedules', { ...schForm, playlistId: Number(schForm.playlistId) }); }
        setSchForm({ name: '', startTime: '07:00', endTime: '08:00', playlistId: '', daysOfWeek: ALL_WEEKDAYS, isActive: true });
        await loadAll(); notify('Đã lưu lịch phát!');
      } catch { notify('Lỗi lưu lịch', 'err'); }
    };
    const deleteSchedule = async (id: number) => {
      if (!(await customConfirm('Xóa lịch này?'))) return;
      try { await api.delete(`/api/schedules/${id}`); await loadAll(); notify('Đã xóa'); }
      catch { notify('Lỗi xóa', 'err'); }
    };
    const startEdit = (s: Schedule) => {
      setEditSch(s);
      setSchForm({ name: s.name, startTime: s.startTime, endTime: s.endTime, playlistId: String(s.playlistId), daysOfWeek: s.daysOfWeek, isActive: s.isActive });
    };
    const toggleActive = async (s: Schedule) => {
      try { await api.put(`/api/schedules/${s.id}`, { ...s, playlistId: s.playlistId, isActive: !s.isActive }); await loadAll(); }
      catch {}
    };

    return (
      <div className="admin-section">
        <h2>Lịch phát nhạc</h2>
        <div className="two-col">
          <div className="col-left">
            <div className="card">
              <h3>{editSch ? `Sửa: ${editSch.name}` : 'Thêm lịch mới'}</h3>
              <div className="form-group">
                <label>Tên lịch</label>
                <input className="input" value={schForm.name} onChange={e => setSchForm({ ...schForm, name: e.target.value })} placeholder="VD: Giờ ra chơi" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Từ giờ</label>
                  <input type="time" className="input" value={schForm.startTime} onChange={e => setSchForm({ ...schForm, startTime: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Đến giờ</label>
                  <input type="time" className="input" value={schForm.endTime} onChange={e => setSchForm({ ...schForm, endTime: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label>Playlist</label>
                <select className="input" value={schForm.playlistId} onChange={e => setSchForm({ ...schForm, playlistId: e.target.value })}>
                  <option value="">Chọn playlist...</option>
                  {playlists.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Ngày trong tuần</label>
                <DayPicker value={schForm.daysOfWeek} onChange={v => setSchForm({ ...schForm, daysOfWeek: v })} />
                <div className="day-presets">
                  <button type="button" className="btn btn-xs" onClick={() => setSchForm({ ...schForm, daysOfWeek: ALL_WEEKDAYS })}>Thứ 2–6</button>
                  <button type="button" className="btn btn-xs" onClick={() => setSchForm({ ...schForm, daysOfWeek: ALL_DAYS })}>Tất cả</button>
                </div>
              </div>
              <div className="btn-row">
                <button className="btn btn-primary" onClick={save}>{editSch ? '💾 Cập nhật' : '➕ Thêm lịch'}</button>
                {editSch && <button className="btn btn-ghost" onClick={() => { setEditSch(null); setSchForm({ name: '', startTime: '07:00', endTime: '08:00', playlistId: '', daysOfWeek: ALL_WEEKDAYS, isActive: true }); }}>Hủy</button>}
              </div>
            </div>
          </div>
          <div className="col-right">
            <div className="card">
              <h3>Danh sách lịch ({schedules.length})</h3>
              {schedules.length === 0 && <div className="empty-state">Chưa có lịch nào</div>}
              {schedules.map(s => (
                <div key={s.id} className={`schedule-item ${!s.isActive ? 'inactive' : ''}`}>
                  <div className="schedule-times">
                    <span className="time-badge">{s.startTime}</span>
                    <span className="time-sep">→</span>
                    <span className="time-badge">{s.endTime}</span>
                  </div>
                  <div className="schedule-info">
                    <div className="schedule-name">{s.name}</div>
                    <div className="schedule-meta">📋 {s.playlist?.name} • {s.daysOfWeek.split(',').map(d => DAYS[Number(d)]).join(' ')}</div>
                  </div>
                  <div className="schedule-actions">
                    <button className={`toggle-btn ${s.isActive ? 'on' : 'off'}`} onClick={() => toggleActive(s)}>{s.isActive ? 'BẬT' : 'TẮT'}</button>
                    <button className="btn btn-icon" onClick={() => startEdit(s)}>✏️</button>
                    <button className="btn btn-icon btn-danger-ghost" onClick={() => deleteSchedule(s.id)}>🗑</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ── Bells ─────────────────────────────
  const [bellForm, setBellForm] = useState({ type: 'PRIMARY', time: '07:00', audioFileId: '', daysOfWeek: ALL_WEEKDAYS, isActive: true });
  const [editBell, setEditBell] = useState<BellConfig | null>(null);

  const Bells = () => {
    const save = async () => {
      if (!bellForm.audioFileId) return notify('Chọn tệp âm thanh', 'err');
      try {
        if (editBell) { await api.put(`/api/schedules/bells/${editBell.id}`, { ...bellForm, audioFileId: Number(bellForm.audioFileId) }); setEditBell(null); }
        else { await api.post('/api/schedules/bells', { ...bellForm, audioFileId: Number(bellForm.audioFileId) }); }
        setBellForm({ type: 'PRIMARY', time: '07:00', audioFileId: '', daysOfWeek: ALL_WEEKDAYS, isActive: true });
        await loadAll(); notify('Đã lưu chuông!');
      } catch { notify('Lỗi lưu chuông', 'err'); }
    };
    const deleteBell = async (id: number) => {
      if (!(await customConfirm('Xóa chuông này?'))) return;
      try { await api.delete(`/api/schedules/bells/${id}`); await loadAll(); }
      catch { notify('Lỗi xóa', 'err'); }
    };
    const toggleActive = async (b: BellConfig) => {
      try { await api.put(`/api/schedules/bells/${b.id}`, { ...b, audioFileId: b.audioFileId, isActive: !b.isActive }); await loadAll(); }
      catch {}
    };
    const startEdit = (b: BellConfig) => {
      setEditBell(b);
      setBellForm({ type: b.type, time: b.time, audioFileId: String(b.audioFileId), daysOfWeek: b.daysOfWeek, isActive: b.isActive });
    };

    return (
      <div className="admin-section">
        <h2>Cài đặt Chuông báo</h2>
        <div className="bell-legend">
          <span className="bell-badge primary">🔔 Tiểu học</span>
          <span className="bell-badge secondary">🔔 Trung học</span>
        </div>
        <div className="two-col">
          <div className="col-left">
            <div className="card">
              <h3>{editBell ? 'Sửa chuông' : 'Thêm chuông mới'}</h3>
              <div className="form-group">
                <label>Cấp bậc</label>
                <div className="radio-group">
                  <label className={`radio-btn ${bellForm.type === 'PRIMARY' ? 'active' : ''}`}><input type="radio" name="type" value="PRIMARY" checked={bellForm.type === 'PRIMARY'} onChange={() => setBellForm({ ...bellForm, type: 'PRIMARY' })} /> Tiểu học</label>
                  <label className={`radio-btn ${bellForm.type === 'SECONDARY' ? 'active' : ''}`}><input type="radio" name="type" value="SECONDARY" checked={bellForm.type === 'SECONDARY'} onChange={() => setBellForm({ ...bellForm, type: 'SECONDARY' })} /> Trung học</label>
                </div>
              </div>
              <div className="form-group">
                <label>Giờ reo chuông</label>
                <input type="time" className="input" value={bellForm.time} onChange={e => setBellForm({ ...bellForm, time: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Âm thanh chuông</label>
                <select className="input" value={bellForm.audioFileId} onChange={e => setBellForm({ ...bellForm, audioFileId: e.target.value })}>
                  <option value="">Chọn tệp âm thanh...</option>
                  {files.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Ngày trong tuần</label>
                <DayPicker value={bellForm.daysOfWeek} onChange={v => setBellForm({ ...bellForm, daysOfWeek: v })} />
                <div className="day-presets">
                  <button type="button" className="btn btn-xs" onClick={() => setBellForm({ ...bellForm, daysOfWeek: ALL_WEEKDAYS })}>Thứ 2–6</button>
                  <button type="button" className="btn btn-xs" onClick={() => setBellForm({ ...bellForm, daysOfWeek: ALL_DAYS })}>Tất cả</button>
                </div>
              </div>
              <div className="btn-row">
                <button className="btn btn-primary" onClick={save}>{editBell ? '💾 Cập nhật' : '➕ Thêm chuông'}</button>
                {editBell && <button className="btn btn-ghost" onClick={() => { setEditBell(null); setBellForm({ type: 'PRIMARY', time: '07:00', audioFileId: '', daysOfWeek: ALL_WEEKDAYS, isActive: true }); }}>Hủy</button>}
              </div>
            </div>
          </div>
          <div className="col-right">
            <div className="card">
              <h3>Danh sách chuông ({bells.length})</h3>
              {bells.length === 0 && <div className="empty-state">Chưa có chuông nào</div>}
              {bells.map(b => (
                <div key={b.id} className={`bell-item ${b.type.toLowerCase()} ${!b.isActive ? 'inactive' : ''}`}>
                  <span className="bell-time-badge">{b.time}</span>
                  <div className="bell-info">
                    <div className="bell-type-label">{b.type === 'PRIMARY' ? '🏫 Tiểu học' : '🏛 Trung học'}</div>
                    <div className="bell-file">{b.audioFile?.name}</div>
                    <div className="bell-days">{b.daysOfWeek.split(',').map(d => DAYS[Number(d)]).join(' ')}</div>
                  </div>
                  <div className="schedule-actions">
                    <button className={`toggle-btn ${b.isActive ? 'on' : 'off'}`} onClick={() => toggleActive(b)}>{b.isActive ? 'BẬT' : 'TẮT'}</button>
                    <button className="btn btn-icon" onClick={() => startEdit(b)}>✏️</button>
                    <button className="btn btn-icon btn-danger-ghost" onClick={() => deleteBell(b.id)}>🗑</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ── Render ───────────────────────────
  const TABS = [
    { key: 'dashboard', icon: 'stats-chart-outline', label: 'Tổng quan' },
    { key: 'files', icon: 'folder-outline', label: 'Lưu trữ' },
    { key: 'playlists', icon: 'musical-notes-outline', label: 'Danh sách phát' },
    { key: 'schedules', icon: 'calendar-outline', label: 'Lịch phát' },
    { key: 'bells', icon: 'notifications-outline', label: 'Cấu hình chuông' },
    { key: 'devices', icon: 'hardware-chip-outline', label: 'Thiết bị' }
  ] as const;

  return (
    <div className="admin-root">
      <div className="mobile-header">
        <button className="mobile-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
        <div style={{ fontWeight: 'bold' }}>AutoBells Admin</div>
        <div style={{ width: '24px' }}></div>
      </div>
      <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)}></div>
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand" style={{ justifyContent: logoUrl ? 'center' : 'flex-start' }}>
          {logoUrl ? (
            <img src={logoUrl} alt="logo" className="sidebar-logo" />
          ) : (
            <>
              <div style={{ fontSize: '1.5rem' }}>🔔</div>
              <div>
                <div className="brand-name">AutoBells</div>
                <div className="brand-sub">Admin Panel</div>
              </div>
            </>
          )}
        </div>
        <nav className="sidebar-nav">
          {TABS.map(t => (
            <button key={t.key} className={`nav-item ${tab === t.key ? 'active' : ''}`} onClick={() => { setTab(t.key); setSidebarOpen(false); }}>
              {React.createElement('ion-icon', { name: t.icon })} {t.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <a href="/" target="_blank" className="nav-item">
            {React.createElement('ion-icon', { name: 'desktop-outline' })} Màn hình Player
          </a>
          <button className="nav-item logout" onClick={logout}>
            {React.createElement('ion-icon', { name: 'log-out-outline' })} Đăng xuất
          </button>
          
          <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
            <div>© {new Date().getFullYear()} minhhan.net</div>
            <div style={{ fontWeight: 600, color: 'var(--text)' }}>AutoBells</div>
          </div>
        </div>
      </aside>

      <main className="admin-main" onClick={() => setSidebarOpen(false)}>
        <div className="admin-content">
          {tab === 'dashboard' && Dashboard()}
          {tab === 'files' && Files()}
          {tab === 'playlists' && Playlists()}
          {tab === 'schedules' && Schedules()}
          {tab === 'bells' && Bells()}
          {tab === 'devices' && Devices()}
        </div>

        {msg && <div className={`admin-notify ${msg.type === 'err' ? 'err' : ''}`}>
          {msg.type === 'ok' ? '✅' : '❌'} {msg.text}
        </div>}

        {dialog && (
          <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center', width: '100%' }}>
              <p style={{ fontSize: '1.1rem', marginBottom: '1.5rem', color: 'var(--text)' }}>{dialog.message}</p>
              {dialog.type === 'prompt' && (
                <input 
                  type="text" 
                  className="input" 
                  autoFocus
                  defaultValue={dialog.defaultValue} 
                  style={{ width: '100%', marginBottom: '1.5rem' }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') dialog.onConfirm((e.target as HTMLInputElement).value);
                    if (e.key === 'Escape') dialog.onCancel();
                  }}
                  id="dialog-prompt-input"
                />
              )}
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                {dialog.type !== 'alert' && <button className="btn btn-outline" onClick={dialog.onCancel}>Hủy</button>}
                <button className="btn btn-primary" onClick={() => {
                  if (dialog.type === 'prompt') {
                    const input = document.getElementById('dialog-prompt-input') as HTMLInputElement;
                    dialog.onConfirm(input?.value);
                  } else {
                    dialog.onConfirm();
                  }
                }}>Đồng ý</button>
              </div>
            </div>
          </div>
        )}
      </main>

      <aside className="admin-right-sidebar">
        {RightSidebar()}
      </aside>
    </div>
  );
}
