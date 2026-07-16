import React, { useState, useEffect } from 'react';
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
        setMediaCurrentTime(nowPlaying.pauseOffset);
      } else if (nowPlaying.status === 'playing' && nowPlaying.targetTime) {
        const elapsed = (Date.now() - nowPlaying.targetTime) / 1000;
        setMediaCurrentTime(Math.max(0, Math.min(elapsed, mediaDuration || elapsed)));
      }
    }, 1000);
    return () => clearInterval(t);
  }, [nowPlaying, mediaDuration]);

  useEffect(() => { 
    document.title = 'Dashboard - AutoBells by minhhan.net';
    loadAll(); 

    const socket: Socket = io({ auth: { token: sessionStorage.getItem('token') } });
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

    return () => { socket.disconnect(); };
  }, []);

  const logout = () => { sessionStorage.removeItem('token'); navigate('/login'); };

  // Idle timeout (30 phút)
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        sessionStorage.removeItem('token');
        navigate('/login');
        alert('Phiên đăng nhập đã hết hạn do không có thao tác nào trong 30 phút. Vui lòng đăng nhập lại.');
      }, 30 * 60 * 1000); // 30 minutes
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

  const updateDevice = async (id: string, updates: any) => {
    try {
      await api.put(`/api/devices/${id}`, updates);
      fetchDevices();
    } catch {}
  };

  const deleteDevice = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa và kick thiết bị này?')) return;
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
          <div style={{ fontSize: '2.5rem' }}>🔔</div>
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
                  <button className="btn btn-primary btn-sm" onClick={() => playManual('playlist', p.id)}>▶ Phát</button>
                </div>
              ))}
            </div>

            <h3 style={{ marginTop: '1.5rem' }}>Phát Tệp Âm Thanh</h3>
            {files.length === 0 && <div className="empty-state" style={{ padding: '1rem' }}>Chưa có tệp nào</div>}
            <div className="play-card-container">
              {files.map(f => (
                <div className="play-card" key={f.id}>
                  <div className="play-card-title" title={f.name}>{f.name}</div>
                  <button className="btn btn-primary btn-sm" onClick={() => playManual('file', f.id)}>▶ Phát</button>
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
          {nowPlaying && nowPlaying.status === 'playing' ? (
            <div className="music-bars"><span/><span/><span/><span/><span/></div>
          ) : <span>🎵</span>}
        </div>
        <div className="media-info">
          <div className="media-status">{nowPlaying ? (nowPlaying.status === 'playing' ? 'ĐANG PHÁT' : 'TẠM DỪNG') : 'SẴN SÀNG'}</div>
          <div className="media-title" title={nowPlaying?.name}>{nowPlaying ? nowPlaying.name : 'Chưa có bài hát nào'}</div>
          {nowPlaying?.isOverride && <div className="media-override">* Đang ghi đè âm lượng</div>}
        </div>
        
        <div className="media-progress">
          <span className="time-current">{formatTime(mediaCurrentTime)}</span>
          <input type="range" className="time-slider" min="0" max={mediaDuration || 100} value={mediaCurrentTime} onChange={handleSeek} disabled={!nowPlaying} />
          <span className="time-total">{formatTime(mediaDuration)}</span>
        </div>

        <div className="media-controls">
          <button className="btn-icon" onClick={() => api.post('/api/admin/prev')} disabled={!nowPlaying} title="Bài trước">⏮</button>
          {nowPlaying?.status === 'playing' ? (
            <button className="btn-icon play-btn" onClick={() => api.post('/api/admin/pause')} title="Tạm dừng">⏸</button>
          ) : (
            <button className="btn-icon play-btn" onClick={() => api.post('/api/admin/resume')} disabled={!nowPlaying} title="Phát tiếp">▶</button>
          )}
          <button className="btn-icon" onClick={() => api.post('/api/admin/next')} disabled={!nowPlaying} title="Bài tiếp theo">⏭</button>
          <button className="btn-icon btn-stop" onClick={() => api.post('/api/admin/stop')} disabled={!nowPlaying} title="Dừng hẳn">⏹</button>
        </div>

        <div className="media-volume">
          <span title="Âm lượng hệ thống">🔈</span>
          <input type="range" min="0" max="1" step="0.05" value={volume} onChange={(e) => handleVolumeChange(Number(e.target.value))} />
          <span>🔊 {Math.round(volume * 100)}%</span>
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

  const Devices = () => (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2>Danh sách thiết bị kết nối</h2>
        <button className="btn btn-primary btn-sm" onClick={fetchDevices}>Tải lại</button>
      </div>
      <table className="table">
        <thead>
          <tr>
            <th>ID / Tên thiết bị</th>
            <th>Địa chỉ IP</th>
            <th>Lần cuối hoạt động</th>
            <th>Trạng thái</th>
            <th>Hành động</th>
          </tr>
        </thead>
        <tbody>
          {devices.length === 0 ? (
            <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có thiết bị nào kết nối</td></tr>
          ) : devices.map(d => (
            <tr key={d.id}>
              <td>
                <div style={{ fontWeight: 600 }}>{d.name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{d.id}</div>
              </td>
              <td style={{ fontFamily: 'monospace' }}>{d.ipAddress || '-'}</td>
              <td>{new Date(d.lastSeen).toLocaleString('vi-VN')}</td>
              <td>
                {d.isApproved 
                  ? <span style={{ color: 'var(--success)', fontWeight: 600 }}>Đã duyệt</span>
                  : <span style={{ color: 'var(--warning)', fontWeight: 600 }}>Chờ duyệt</span>
                }
              </td>
              <td>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-primary btn-sm" onClick={() => {
                    const newName = prompt('Nhập tên thiết bị mới:', d.name);
                    if (newName) updateDevice(d.id, { name: newName });
                  }}>Đổi tên</button>
                  <button className="btn btn-sm" style={{ background: d.isApproved ? 'var(--warning)' : 'var(--success)', color: '#fff' }} onClick={() => updateDevice(d.id, { isApproved: !d.isApproved })}>
                    {d.isApproved ? 'Khóa' : 'Duyệt'}
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => {
                    if (confirm('Xóa thiết bị này?')) deleteDevice(d.id);
                  }}>Xóa</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

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
      if (!confirm('Xóa tệp này?')) return;
      try { await api.delete(`/api/files/${id}`); await loadAll(); notify('Đã xóa'); }
      catch { notify('Lỗi xóa tệp', 'err'); }
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
              <label className="btn btn-outline btn-sm">
                📷 Thay logo (PNG)
                <input type="file" accept="image/*" hidden onChange={e => uploadAsset('logo', e)} />
              </label>
            </div>
            <div className="asset-item">
              <div className="asset-preview favicon-preview">
                <span>🖼 Favicon</span>
              </div>
              <label className="btn btn-outline btn-sm">
                🖼 Thay favicon
                <input type="file" accept="image/*,.ico" hidden onChange={e => uploadAsset('favicon', e)} />
              </label>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Kho dữ liệu ({files.length})</h3>
            <label className={`btn btn-primary btn-sm ${fileUploading ? 'disabled' : ''}`}>
              {fileUploading ? `⏳ ${uploadProgress}` : '⬆ Tải lên Tệp (Âm thanh/Ảnh)'}
              <input type="file" accept="audio/*,image/png,image/jpeg,image/svg+xml" multiple hidden onChange={upload} disabled={fileUploading} />
            </label>
          </div>
          <div className="file-list">
            {files.length === 0 && <div className="empty-state">Chưa có tệp nào. Hãy tải lên!</div>}
            {files.map(f => (
              <div key={f.id} className="file-item">
                <span className="file-icon">🎵</span>
                <div className="file-info">
                  <div className="file-name">{f.name}</div>
                  <div className="file-meta">{f.filename}</div>
                </div>
                <audio controls src={`${API_URL}${f.path}`} className="file-audio" />
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
    const delPL = async (id: number) => {
      if (!confirm('Xóa playlist này?')) return;
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
                  <button className="btn btn-icon btn-danger-ghost" onClick={e => { e.stopPropagation(); delPL(pl.id); }}>🗑</button>
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
    const del = async (id: number) => {
      if (!confirm('Xóa lịch này?')) return;
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
                    <button className="btn btn-icon btn-danger-ghost" onClick={() => del(s.id)}>🗑</button>
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
    const del = async (id: number) => {
      if (!confirm('Xóa chuông này?')) return;
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
                    <button className="btn btn-icon btn-danger-ghost" onClick={() => del(b.id)}>🗑</button>
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
    { key: 'dashboard', label: 'Trang chủ' },
    { key: 'files', label: 'Lưu trữ' },
    { key: 'playlists', label: 'Playlists' },
    { key: 'schedules', label: 'Lịch Nhạc' },
    { key: 'bells', label: 'Lịch Chuông' },
    { key: 'devices', label: 'Thiết bị' }
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
            <button key={t.key} className={`nav-item ${tab === t.key ? 'active' : ''}`} onClick={() => { setTab(t.key); setSidebarOpen(false); }}>{t.label}</button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <a href="/" target="_blank" className="nav-item">🖥 Màn hình Player</a>
          <button className="nav-item logout" onClick={logout}>🚪 Đăng xuất</button>
          
          <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
            <div style={{ fontWeight: 600, color: 'var(--text)' }}>AutoBells</div>
            <div>© {new Date().getFullYear()} minhhan.net</div>
          </div>
        </div>
      </aside>

      <main className="admin-main" onClick={() => setSidebarOpen(false)}>
        {msg && <div className={`toast ${msg.type}`}>{msg.type === 'ok' ? '✅' : '❌'} {msg.text}</div>}
        {tab === 'dashboard' && Dashboard()}
        {tab === 'files' && Files()}
        {tab === 'playlists' && Playlists()}
        {tab === 'schedules' && Schedules()}
        {tab === 'bells' && Bells()}
        {tab === 'devices' && Devices()}
      </main>

      <aside className="admin-right-sidebar">
        {RightSidebar()}
      </aside>
    </div>
  );
}
