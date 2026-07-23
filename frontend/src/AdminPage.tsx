import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { API_URL } from './api';
import { io, Socket } from 'socket.io-client';
import './admin.css';

const PREDEFINED_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e', '#64748b'];
const guessIcon = (name: string) => {
  if (!name) return 'business-outline';
  const n = name.toLowerCase();
  if (n.includes('tiểu học') || n.includes('mầm non')) return 'school-outline';
  if (n.includes('thcs') || n.includes('thpt') || n.includes('trung học')) return 'library-outline';
  if (n.includes('xưởng') || n.includes('nhà máy') || n.includes('kho')) return 'construct-outline';
  if (n.includes('kế toán') || n.includes('tài chính')) return 'cash-outline';
  if (n.includes('giám đốc') || n.includes('quản lý') || n.includes('admin')) return 'briefcase-outline';
  if (n.includes('y tế') || n.includes('bệnh viện') || n.includes('phòng khám')) return 'medkit-outline';
  if (n.includes('tin học') || n.includes('máy tính') || n.includes('it')) return 'laptop-outline';
  if (n.includes('bảo vệ') || n.includes('an ninh')) return 'shield-checkmark-outline';
  if (n.includes('ngoài trời') || n.includes('sân') || n.includes('thể dục')) return 'football-outline';
  if (n.includes('hành chính') || n.includes('văn phòng')) return 'desktop-outline';
  return 'business-outline';
};

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
interface Department { id: number; name: string; color: string; description?: string; }
interface BellConfig { id: number; name?: string; departmentId: number; department?: Department; time: string; audioFileId: number; audioFile: AudioFile; isActive: boolean; daysOfWeek: string; volume: number; }

const DAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const ALL_WEEKDAYS = '1,2,3,4,5';
const ALL_DAYS = '0,1,2,3,4,5,6';

export type OrgMode = 'GENERAL' | 'SCHOOL' | 'OFFICE' | 'FACTORY';

export const ORG_PROFILES: Record<OrgMode, {
  name: string;
  icon: string;
  tabLabel: string;
  itemUnit: string;
  itemName: string;
  itemBaseDefault: string;
  startTimeLabel: string;
  endTimeLabel: string;
  startBellLabel: string;
  endBellLabel: string;
  departmentLabel: string;
  batchDescription: string;
}> = {
  GENERAL: {
    name: 'Tùy chỉnh / Tổng hợp',
    icon: 'time-outline',
    tabLabel: 'Quản lý Khung giờ',
    itemUnit: 'khung giờ',
    itemName: 'Khung giờ',
    itemBaseDefault: 'Khung',
    startTimeLabel: 'Giờ bắt đầu',
    endTimeLabel: 'Giờ kết thúc',
    startBellLabel: 'Bắt đầu',
    endBellLabel: 'Kết thúc',
    departmentLabel: 'Phân loại / Khu vực',
    batchDescription: 'Tự động tạo danh sách mốc thời gian báo chuông...'
  },
  SCHOOL: {
    name: 'Trường học (Tiết học)',
    icon: 'school-outline',
    tabLabel: 'Quản lý Tiết học',
    itemUnit: 'tiết',
    itemName: 'Tiết học',
    itemBaseDefault: 'Tiết',
    startTimeLabel: 'Giờ vào tiết',
    endTimeLabel: 'Giờ ra tiết',
    startBellLabel: 'Vào tiết',
    endBellLabel: 'Ra tiết',
    departmentLabel: 'Khối lớp / Khu vực',
    batchDescription: 'Tự động tạo danh sách tiết học theo ca sáng/chiều...'
  },
  OFFICE: {
    name: 'Cơ quan / Văn phòng',
    icon: 'briefcase-outline',
    tabLabel: 'Quản lý Ca làm việc',
    itemUnit: 'ca',
    itemName: 'Ca / Giờ làm',
    itemBaseDefault: 'Ca',
    startTimeLabel: 'Giờ bắt đầu ca',
    endTimeLabel: 'Giờ kết thúc ca',
    startBellLabel: 'Vào giờ làm',
    endBellLabel: 'Tan giờ làm',
    departmentLabel: 'Phòng ban / Tầng',
    batchDescription: 'Tự động tạo ca sáng, ca chiều, giờ nghỉ trưa...'
  },
  FACTORY: {
    name: 'Nhà máy / Xí nghiệp',
    icon: 'construct-outline',
    tabLabel: 'Quản lý Ca sản xuất',
    itemUnit: 'ca',
    itemName: 'Ca sản xuất',
    itemBaseDefault: 'Ca',
    startTimeLabel: 'Giờ vào ca',
    endTimeLabel: 'Giờ tan ca',
    startBellLabel: 'Vào ca',
    endBellLabel: 'Tan ca',
    departmentLabel: 'Phân xưởng / Dây chuyền',
    batchDescription: 'Tự động tạo Ca 1, Ca 2, Ca 3, giờ giao ca...'
  }
};

function DayPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const safeValue = value || '';
  const selected = safeValue ? safeValue.split(',').map(Number).filter(n => !isNaN(n)) : [];
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
  const [tab, setTab] = useState<'dashboard' | 'files' | 'playlists' | 'schedules' | 'bells' | 'departments' | 'devices' | 'settings' | 'users' | 'system'>('dashboard');
  const [systemSubTab, setSystemSubTab] = useState<'profile' | 'users' | 'devices'>('devices');
  const [systemMenuOpen, setSystemMenuOpen] = useState(false);
  const [userRole, setUserRole] = useState<'ADMIN' | 'OPERATOR'>('OPERATOR');
  
  const [showUserForm, setShowUserForm] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'OPERATOR' });

  // Data
  const [files, setFiles] = useState<AudioFile[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [bells, setBells] = useState<BellConfig[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [msg, setMsg] = useState<{ text: string; type: 'ok' | 'err' } | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [volume, setVolume] = useState<number>(1.0);
  const [globalFadeInDuration, setGlobalFadeInDuration] = useState<number>(1);
  const [orgMode, setOrgMode] = useState<OrgMode>(() => (localStorage.getItem('org_mode') as OrgMode) || 'GENERAL');

  const fetchUsers = async () => {
    try {
      const res = await api.get('/api/users');
      setUsersList(Array.isArray(res.data) ? res.data : []);
    } catch {}
  };

  const fetchDevices = async () => {
    try {
      const res = await api.get('/api/devices');
      setDevices(Array.isArray(res.data) ? res.data : []);
    } catch {}
  };

  useEffect(() => {
    if (userRole === 'ADMIN') {
      fetchDevices();
      fetchUsers();
    }
  }, [tab, userRole, systemSubTab]);

  const changeOrgMode = (mode: OrgMode) => {
    setOrgMode(mode);
    localStorage.setItem('org_mode', mode);
    notify(`Đã chuyển loại hình tổ chức sang: ${ORG_PROFILES[mode].name}`);
  };

  const curProfile = ORG_PROFILES[orgMode] || ORG_PROFILES.GENERAL;

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

  // const customAlert = (message: string) => {
  //   setDialog({
  //     message, type: 'alert',
  //     onConfirm: () => setDialog(null),
  //     onCancel: () => setDialog(null)
  //   });
  // };

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
          {playing ? React.createElement('ion-icon', { name: 'pause' }) : React.createElement('ion-icon', { name: 'play' })}
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
      const [f, p, s, b, a, state, deps, prs] = await Promise.all([
        api.get('/api/files'), api.get('/api/playlists'),
        api.get('/api/schedules'), api.get('/api/bells'),
        api.get('/api/files/assets/info'), api.get('/api/admin/state'), api.get('/api/departments'),
        api.get('/api/periods')
      ]);
      
      if (!Array.isArray(s.data)) console.error("schedules is not array!", s.data);
      if (!Array.isArray(b.data)) console.error("bells is not array!", b.data);
      
      setFiles(Array.isArray(f.data) ? f.data : []);
      setPlaylists(Array.isArray(p.data) ? p.data : []);
      setSchedules(Array.isArray(s.data) ? s.data : []);
      setBells(Array.isArray(b.data) ? b.data : []);
      setDepartments(Array.isArray(deps.data) ? deps.data : []);
      setPeriods(Array.isArray(prs.data) ? prs.data : []);
   
      if (a.data.logo) setLogoUrl(`${API_URL}${a.data.logo}`);
      if (state.data.volume !== undefined) setVolume(state.data.volume);
      if (state.data.fadeInDuration !== undefined) setGlobalFadeInDuration(state.data.fadeInDuration);
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
    document.title = 'Dashboard - Automation Audio System | minhhan.net';
    loadAll(); 

    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.role) setUserRole(payload.role);
      } catch (e) {}
    }

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
      socket.on('DEVICES_UPDATED', () => api.get('/api/devices').then(r => setDevices(r.data)));
      socket.on('SET_VOLUME', (data) => setVolume(data.volume));
      socket.on('SET_FADE_IN', (data) => setGlobalFadeInDuration(data.fadeInDuration));
      
      return () => { socket.disconnect(); };
  }, []);

  const logout = () => { 
    sessionStorage.removeItem('token'); 
    localStorage.removeItem('token');
    localStorage.removeItem('rememberMe');
    navigate('/login'); 
  };



  // ── Dashboard ───────────────────────
  const handleVolumeChange = async (val: number) => {
    setVolume(val);
    try { await api.post('/api/admin/volume', { volume: val }); } catch {}
  };

  const handleFadeInChange = (val: number) => {
    const safeVal = Math.max(0, val);
    setGlobalFadeInDuration(safeVal);
    const socket = io({ auth: { token: localStorage.getItem('token') || sessionStorage.getItem('token') } });
    socket.emit('SET_FADE_IN', safeVal);
    socket.disconnect();
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 style={{ margin: 0 }}>Bảng điều khiển</h2>
        
        {userRole === 'ADMIN' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)', padding: '0.45rem 1rem', borderRadius: '12px' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              {React.createElement('ion-icon', { name: 'business-outline' })} Chế độ Văn phong Hệ thống:
            </span>
            <select 
              className="input" 
              style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem', borderRadius: '8px', border: '1px solid var(--accent)', background: 'var(--sidebar-bg)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
              value={orgMode}
              onChange={(e) => changeOrgMode(e.target.value as OrgMode)}
            >
              <option value="GENERAL">Tùy chỉnh / General (Khung giờ)</option>
              <option value="SCHOOL">Trường học (Tiết học)</option>
              <option value="OFFICE">Cơ quan / Văn phòng (Ca làm việc)</option>
              <option value="FACTORY">Nhà máy / Xí nghiệp (Ca sản xuất)</option>
            </select>
          </div>
        )}
      </div>

      {bellPlaying && (
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--accent)', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem', animation: 'pulse 2s infinite' }}>
          <div style={{ fontSize: '2.5rem', color: 'var(--accent)' }}>{React.createElement('ion-icon', { name: 'notifications' })}</div>
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
            <div className={`admin-vinyl-record ${nowPlaying.status === 'paused' ? 'paused' : ''}`}>
              <div className="vinyl-center">
                {React.createElement('ion-icon', { name: 'musical-notes' })}
              </div>
            </div>
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

        <div className="media-volume" style={{ flexWrap: 'wrap', gap: '1rem', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span title="Âm lượng hệ thống">{React.createElement('ion-icon', { name: 'volume-low' })}</span>
            <input type="range" min="0" max="1" step="0.01" value={volume} onChange={(e) => handleVolumeChange(Number(e.target.value))} />
            <span>{React.createElement('ion-icon', { name: 'volume-high' })} {Math.round(volume * 100)}%</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '4px 12px', borderRadius: '20px' }}>
            <span title="Độ trễ Fade-in chung" style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>Fade-in:</span>
            <input type="number" min="0" step="0.5" className="input" style={{ width: '60px', padding: '2px 8px', height: '24px', fontSize: '0.85rem' }} value={globalFadeInDuration} onChange={e => handleFadeInChange(Number(e.target.value))} />
            <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>s</span>
          </div>
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
          }}>{React.createElement('ion-icon', { name: 'pencil-outline' })} Đổi tên</button>
          <button className={`btn btn-xs ${d.isApproved ? 'btn-danger-ghost' : 'btn-primary'}`} style={{flex: 1}} onClick={() => updateDevice(d.id, { isApproved: !d.isApproved })}>
            {d.isApproved ? (
              <>{React.createElement('ion-icon', { name: 'lock-closed-outline' })} Khóa</>
            ) : (
              <>{React.createElement('ion-icon', { name: 'checkmark-outline' })} Duyệt</>
            )}
          </button>
          <button className="btn btn-danger-ghost btn-xs" style={{flex: 1}} onClick={() => deleteDevice(d.id)}>
            {!d.isApproved ? (
              <>{React.createElement('ion-icon', { name: 'ban-outline' })} Từ chối</>
            ) : (
              <>{React.createElement('ion-icon', { name: 'trash-outline' })} Xóa</>
            )}
          </button>
        </div>
      </div>
    );

    return (
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2>Quản lý thiết bị kết nối</h2>
          <button className="btn btn-primary btn-sm" onClick={fetchDevices}>{React.createElement('ion-icon', { name: 'refresh-outline' })} Tải lại</button>
        </div>

        {pendingDevices.length > 0 && (
          <div style={{ marginBottom: '3rem' }}>
            <div className="section-title" style={{ color: 'var(--warning)', marginBottom: '1rem', borderBottom: '1px solid rgba(245,158,11,0.2)', paddingBottom: '0.5rem' }}>
              {React.createElement('ion-icon', { name: 'warning-outline', style: { marginRight: '8px' } })}
              Thiết bị chờ phê duyệt ({pendingDevices.length})
            </div>
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
  const [selectedFileIds, setSelectedFileIds] = useState<number[]>([]);

  const Files = () => {
    const toggleSelectFile = (id: number) => {
      setSelectedFileIds(prev =>
        prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
      );
    };

    const toggleSelectAll = () => {
      if (files.length > 0 && selectedFileIds.length === files.length) {
        setSelectedFileIds([]);
      } else {
        setSelectedFileIds(files.map(f => f.id));
      }
    };

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
      try {
        await api.delete(`/api/files/${id}`);
        setSelectedFileIds(prev => prev.filter(i => i !== id));
        await loadAll();
        notify('Đã xóa');
      } catch (err: any) {
        notify(err.response?.data?.error || 'Lỗi xóa tệp', 'err');
      }
    };

    const bulkDelete = async () => {
      if (selectedFileIds.length === 0) return;
      if (!(await customConfirm(`Bạn có chắc chắn muốn xóa ${selectedFileIds.length} tệp đã chọn?`))) return;
      try {
        const res = await api.post('/api/files/bulk-delete', { ids: selectedFileIds });
        const { deletedCount, skippedFiles } = res.data;
        setSelectedFileIds([]);
        await loadAll();
        if (skippedFiles && skippedFiles.length > 0) {
          notify(`Đã xóa ${deletedCount} tệp. Bỏ qua ${skippedFiles.length} tệp do đang dùng trong Chuông/Tiết học.`);
        } else {
          notify(`Đã xóa thành công ${deletedCount} tệp!`);
        }
      } catch (err: any) {
        notify(err.response?.data?.error || 'Lỗi xóa nhiều tệp', 'err');
      }
    };
    
    const syncFiles = async () => {
      try {
        const res = await api.post('/api/files/sync');
        const { addedCount = 0, deletedCount = 0 } = res.data;
        notify(`Đồng bộ xong! Đã nạp ${addedCount} tệp mới, xóa ${deletedCount} tệp không còn trên máy chủ.`);
        setSelectedFileIds([]);
        await loadAll();
      } catch (err: any) {
        notify(err.response?.data?.error || 'Lỗi đồng bộ tệp', 'err');
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
          <div className="card-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h3>Kho dữ liệu ({files.length})</h3>
              {files.length > 0 && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', userSelect: 'none' }}>
                  <input
                    type="checkbox"
                    checked={files.length > 0 && selectedFileIds.length === files.length}
                    onChange={toggleSelectAll}
                  />
                  Chọn tất cả
                </label>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {selectedFileIds.length > 0 && (
                <button className="btn btn-danger-ghost btn-sm" onClick={bulkDelete}>
                  {React.createElement('ion-icon', { name: 'trash-outline' })} Xóa đã chọn ({selectedFileIds.length})
                </button>
              )}
              <button className="btn btn-outline btn-sm" onClick={syncFiles}>
                {React.createElement('ion-icon', { name: 'sync-outline' })} Đồng bộ
              </button>
              <label className={`btn btn-primary btn-sm ${fileUploading ? 'disabled' : ''}`}>
                {fileUploading ? (
                  <>{React.createElement('ion-icon', { name: 'hourglass-outline' })} {uploadProgress}</>
                ) : (
                  <>{React.createElement('ion-icon', { name: 'cloud-upload-outline' })} Tải lên</>
                )}
                <input type="file" accept="audio/*" multiple hidden onChange={upload} disabled={fileUploading} />
              </label>
            </div>
          </div>
          <div className="file-list">
            {files.length === 0 && <div className="empty-state">Chưa có tệp nào. Hãy tải lên!</div>}
            {files.map(f => {
              const isSelected = selectedFileIds.includes(f.id);
              return (
                <div key={f.id} className={`file-item ${isSelected ? 'selected' : ''}`} style={isSelected ? { background: 'rgba(134, 59, 255, 0.12)', borderColor: '#863bff' } : {}}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelectFile(f.id)}
                    style={{ marginRight: '0.5rem', cursor: 'pointer', width: '16px', height: '16px' }}
                  />
                  <span className="file-icon">{React.createElement('ion-icon', { name: 'musical-note' })}</span>
                  <div className="file-info" style={{ minWidth: 0, flex: 1 }}>
                    <div className="file-name" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, flex: 1 }} title={f.name}>{f.name}</span>
                      <button className="btn btn-ghost btn-xs" onClick={() => renameFile(f.id, f.name)} title="Đổi tên" style={{ padding: '2px 4px', flexShrink: 0 }}>{React.createElement('ion-icon', { name: 'pencil-outline' })}</button>
                    </div>
                    <div className="file-meta" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={f.filename}>{f.filename}</div>
                  </div>
                  <MiniPlayer src={`${API_URL}${f.path}`} />
                  <button className="btn btn-icon btn-danger-ghost" onClick={() => del(f.id)} title="Xóa">
                    {React.createElement('ion-icon', { name: 'trash-outline' })}
                  </button>
                </div>
              );
            })}
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
                <button className="btn btn-primary btn-sm" onClick={createPL}>{React.createElement('ion-icon', { name: 'add-outline' })} Tạo</button>
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
                  <button className="btn btn-icon btn-danger-ghost" onClick={e => { e.stopPropagation(); deletePlaylist(pl.id); }}>
                    {React.createElement('ion-icon', { name: 'trash-outline' })}
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="col-right">
            {selectedPL ? (() => {
              const pl = playlists.find(p => p.id === selectedPL.id) || selectedPL;
              return (
                <div className="card">
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {React.createElement('ion-icon', { name: 'musical-notes-outline' })} {pl.name}
                  </h3>
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
                    <button className="btn btn-primary btn-sm" onClick={() => addItem(pl.id)}>{React.createElement('ion-icon', { name: 'add-outline' })} Thêm</button>
                  </div>
                  {pl.items?.length === 0 && <div className="empty-state">Chưa có bài nào trong playlist</div>}
                  {pl.items?.map((item, i) => (
                    <div key={item.id} className="pl-item-row">
                      <span className="pl-item-num">{i + 1}</span>
                      <span className="pl-item-name">{item.audioFile.name}</span>
                      <button className="btn btn-icon btn-danger-ghost" onClick={() => removeItem(pl.id, item.id)}>{React.createElement('ion-icon', { name: 'close-outline' })}</button>
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
              <h3>Thêm lịch mới</h3>
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
                <button className="btn btn-primary" onClick={save}>
                  {React.createElement('ion-icon', { name: 'add-outline' })} Thêm lịch
                </button>
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
                    <div className="schedule-meta">
                      {React.createElement('ion-icon', { name: 'clipboard-outline', style: {marginRight: '4px'} })} {s.playlist?.name} • {s.daysOfWeek.split(',').map(d => DAYS[Number(d)]).join(' ')}
                    </div>
                  </div>
                  <div className="schedule-actions">
                    <button className={`toggle-btn ${s.isActive ? 'on' : 'off'}`} onClick={() => toggleActive(s)}>{s.isActive ? 'BẬT' : 'TẮT'}</button>
                    <button className="btn btn-icon" onClick={() => startEdit(s)}>
                      {React.createElement('ion-icon', { name: 'pencil-outline' })}
                    </button>
                    <button className="btn btn-icon btn-danger-ghost" onClick={() => deleteSchedule(s.id)}>
                      {React.createElement('ion-icon', { name: 'trash-outline' })}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal sửa lịch phát nhạc riêng lẻ */}
        {editSch && (
          <div className="modal-overlay" style={{ zIndex: 1000 }}>
            <div className="modal-content" style={{ maxWidth: '500px', width: '100%' }}>
              <h3 style={{ marginTop: 0, marginBottom: '1.25rem' }}>Sửa lịch: {editSch.name}</h3>
              <div className="form-group">
                <label>Tên lịch phát</label>
                <input className="input" value={schForm.name} onChange={e => setSchForm({ ...schForm, name: e.target.value })} />
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
              </div>
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="checkbox" id="edit-sch-active" checked={schForm.isActive} onChange={e => setSchForm({ ...schForm, isActive: e.target.checked })} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                <label htmlFor="edit-sch-active" style={{ cursor: 'pointer', fontWeight: 600 }}>Kích hoạt lịch này</label>
              </div>
              <div className="btn-row" style={{ marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                <button className="btn btn-primary" onClick={save}>
                  {React.createElement('ion-icon', { name: 'save-outline' })} Lưu thay đổi
                </button>
                <button className="btn btn-ghost" onClick={() => { setEditSch(null); setSchForm({ name: '', startTime: '07:00', endTime: '08:00', playlistId: '', daysOfWeek: ALL_WEEKDAYS, isActive: true }); }}>
                  Hủy
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // --- Periods state ---
  const [pForm, setPForm] = React.useState({ name: '', departmentId: '', startTime: '', endTime: '', audioFileId: '', volume: 1.0, isActive: true, daysOfWeek: ALL_WEEKDAYS });
  const [editingPeriod, setEditingPeriod] = React.useState<any | null>(null);
  const [selectedPeriods, setSelectedPeriods] = React.useState<number[]>([]);
  const [showBulkEditPeriod, setShowBulkEditPeriod] = useState(false);
  const [bulkEditPeriodForm, setBulkEditPeriodForm] = useState({ audioFileId: '', departmentId: '', daysOfWeek: '', isActive: 'no-change' });

  // Bulk generator state
  const [bulkDep, setBulkDep] = React.useState('');
  const [bulkAudio, setBulkAudio] = React.useState('');
  const [bulkCount, setBulkCount] = React.useState(10);
  const [bulkStart, setBulkStart] = React.useState('07:00');
  const [bulkDuration, setBulkDuration] = React.useState(45);
  const [bulkBreak, setBulkBreak] = React.useState(10);
  const [bulkLongBreaks, setBulkLongBreaks] = React.useState<{ afterPeriod: number; duration: number }[]>([]);
  const [bulkDays, setBulkDays] = React.useState(ALL_WEEKDAYS);
  const [bulkBaseName, setBulkBaseName] = React.useState('Tiết');
  const [bulkPreview, setBulkPreview] = React.useState<{ name: string; startTime: string; endTime: string }[]>([]);



  // ── Periods (Tiết học) ──────────────────
  const PeriodsTab = () => {
    const padT = (s: string) => s.padStart(2, '0');
    const minsToHHMM = (total: number) => {
      const h = Math.floor(total / 60);
      const m = total % 60;
      return `${padT(String(h))}:${padT(String(m))}:00`;
    };

    const generatePreview = () => {
      if (!bulkStart || bulkCount < 1) return;
      const [hh, mm] = bulkStart.split(':').map(Number);
      let cursor = hh * 60 + mm;
      const result = [];
      for (let i = 1; i <= bulkCount; i++) {
        const s = minsToHHMM(cursor);
        const e = minsToHHMM(cursor + bulkDuration);
        result.push({ name: `${bulkBaseName} ${i}`, startTime: s, endTime: e });
        
        const longBreak = bulkLongBreaks.find(b => b.afterPeriod === i);
        const breakTime = longBreak ? longBreak.duration : bulkBreak;
        
        cursor += bulkDuration + breakTime;
      }
      setBulkPreview(result);
    };

    const saveBulk = async () => {
      if (!bulkDep || !bulkAudio || bulkPreview.length === 0) return notify('Chọn đủ khu vực, nhạc và tạo preview trước!', 'err');
      try {
        await api.post('/api/periods/bulk', {
          periods: bulkPreview.map(p => ({
            name: p.name,
            departmentId: Number(bulkDep),
            startTime: p.startTime,
            endTime: p.endTime,
            audioFileId: Number(bulkAudio),
            volume: 1.0,
            isActive: true,
            daysOfWeek: bulkDays,
          }))
        });
        setBulkPreview([]);
        await loadAll();
        notify(`Đã tạo ${bulkPreview.length} tiết!`);
      } catch { notify('Lỗi tạo hàng loạt', 'err'); }
    };

    const savePeriod = async () => {
      if (!pForm.departmentId || !pForm.startTime || !pForm.endTime || !pForm.audioFileId) return notify('Điền đủ thông tin!', 'err');
      try {
        if (editingPeriod) {
          await api.put(`/api/periods/${editingPeriod.id}`, { ...pForm, departmentId: Number(pForm.departmentId), audioFileId: Number(pForm.audioFileId) });
          setEditingPeriod(null);
          notify('Đã cập nhật tiết!');
        } else {
          await api.post('/api/periods', { ...pForm, departmentId: Number(pForm.departmentId), audioFileId: Number(pForm.audioFileId) });
          notify('Đã thêm tiết!');
        }
        setPForm({ name: '', departmentId: '', startTime: '', endTime: '', audioFileId: '', volume: 1.0, isActive: true, daysOfWeek: ALL_WEEKDAYS });
        await loadAll();
      } catch { notify('Lỗi lưu tiết', 'err'); }
    };

    const openEdit = (p: any) => {
      setEditingPeriod(p);
      setPForm({ name: p.name, departmentId: String(p.departmentId), startTime: p.startTime, endTime: p.endTime, audioFileId: String(p.audioFileId), volume: p.volume, isActive: p.isActive, daysOfWeek: p.daysOfWeek });
    };

    const deletePeriod = async (id: number) => {
      if (!(await customConfirm('Xóa tiết này?'))) return;
      try { await api.delete(`/api/periods/${id}`); await loadAll(); }
      catch { notify('Lỗi xóa', 'err'); }
    };

    const handleBulkUpdatePeriods = async () => {
      if (selectedPeriods.length === 0) return;
      const payload: any = { ids: selectedPeriods };
      if (bulkEditPeriodForm.audioFileId) payload.audioFileId = Number(bulkEditPeriodForm.audioFileId);
      if (bulkEditPeriodForm.departmentId) payload.departmentId = Number(bulkEditPeriodForm.departmentId);
      if (bulkEditPeriodForm.daysOfWeek) payload.daysOfWeek = bulkEditPeriodForm.daysOfWeek;
      if (bulkEditPeriodForm.isActive !== 'no-change') payload.isActive = bulkEditPeriodForm.isActive === 'true';

      if (Object.keys(payload).length <= 1) {
        return notify('Vui lòng chọn ít nhất 1 thông tin cần sửa!', 'err');
      }

      try {
        await api.post('/api/periods/bulk-update', payload);
        setShowBulkEditPeriod(false);
        setBulkEditPeriodForm({ audioFileId: '', departmentId: '', daysOfWeek: '', isActive: 'no-change' });
        setSelectedPeriods([]);
        await loadAll();
        notify(`Đã sửa hàng loạt thành công ${selectedPeriods.length} tiết học!`);
      } catch (err: any) {
        notify(err.response?.data?.error || 'Lỗi sửa hàng loạt tiết học', 'err');
      }
    };

    const bulkDelete = async () => {
      if (selectedPeriods.length === 0) return;
      if (!(await customConfirm(`Xóa ${selectedPeriods.length} tiết đã chọn?`))) return;
      try {
        await api.post('/api/periods/bulk-delete', { ids: selectedPeriods });
        setSelectedPeriods([]);
        await loadAll();
        notify(`Đã xóa ${selectedPeriods.length} tiết!`);
      } catch { notify('Lỗi xóa hàng loạt', 'err'); }
    };

    const toggleSelect = (id: number) => setSelectedPeriods(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    const toggleAll = () => setSelectedPeriods(selectedPeriods.length === periods.length ? [] : periods.map(p => p.id));

    const fmtTime = (t: string) => t ? t.substring(0, 5) : '--:--';

    return (
      <div className="admin-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h2 style={{ margin: 0 }}>{curProfile.tabLabel}</h2>
          
          {userRole === 'ADMIN' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)', padding: '0.45rem 1rem', borderRadius: '12px' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                {React.createElement('ion-icon', { name: 'business-outline' })} Chế độ Văn phong Hệ thống:
              </span>
              <select 
                className="input" 
                style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem', borderRadius: '8px', border: '1px solid var(--accent)', background: 'var(--sidebar-bg)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                value={orgMode}
                onChange={(e) => changeOrgMode(e.target.value as OrgMode)}
              >
                <option value="GENERAL">Tùy chỉnh / General (Khung giờ)</option>
                <option value="SCHOOL">Trường học (Tiết học)</option>
                <option value="OFFICE">Cơ quan / Văn phòng (Ca làm việc)</option>
                <option value="FACTORY">Nhà máy / Xí nghiệp (Ca sản xuất)</option>
              </select>
            </div>
          )}
        </div>

        {/* ─── Modal sửa hàng loạt (Chỉ Nhạc chuông & Trạng thái) ─── */}
        {showBulkEditPeriod && (
          <div className="modal-overlay" style={{ zIndex: 1000 }}>
            <div className="modal-content" style={{ maxWidth: '480px', width: '100%', border: '1px solid var(--accent)' }}>
              <h3 style={{ marginTop: 0, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent)' }}>
                {React.createElement('ion-icon', { name: 'pencil-outline' })} Sửa hàng loạt {selectedPeriods.length} {curProfile.itemUnit}
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                Thay đổi Nhạc chuông hoặc Trạng thái áp dụng đồng loạt cho {selectedPeriods.length} {curProfile.itemUnit} đã chọn.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label>Đổi Nhạc chuông hàng loạt</label>
                  <select className="input" value={bulkEditPeriodForm.audioFileId} onChange={e => setBulkEditPeriodForm({ ...bulkEditPeriodForm, audioFileId: e.target.value })}>
                    <option value="">-- Giữ nguyên nhạc cũ --</option>
                    {files.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label>Trạng thái Kích hoạt hàng loạt</label>
                  <select className="input" value={bulkEditPeriodForm.isActive} onChange={e => setBulkEditPeriodForm({ ...bulkEditPeriodForm, isActive: e.target.value })}>
                    <option value="no-change">-- Giữ nguyên trạng thái cũ --</option>
                    <option value="true">Bật kích hoạt tất cả</option>
                    <option value="false">Tắt kích hoạt tất cả</option>
                  </select>
                </div>
              </div>

              <div className="btn-row" style={{ marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                <button className="btn btn-primary" onClick={handleBulkUpdatePeriods}>
                  {React.createElement('ion-icon', { name: 'checkmark-circle-outline' })} Áp dụng sửa {selectedPeriods.length} {curProfile.itemUnit}
                </button>
                <button className="btn btn-ghost" onClick={() => { setShowBulkEditPeriod(false); setBulkEditPeriodForm({ audioFileId: '', departmentId: '', daysOfWeek: '', isActive: 'no-change' }); }}>
                  Hủy
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── Modal sửa riêng lẻ 1 mục ─── */}
        {editingPeriod && (
          <div className="modal-overlay" style={{ zIndex: 1000 }}>
            <div className="modal-content" style={{ maxWidth: '520px', width: '100%', border: '1px solid var(--primary)' }}>
              <h3 style={{ marginTop: 0, marginBottom: '1.25rem' }}>Sửa {curProfile.itemName.toLowerCase()}: {editingPeriod.name}</h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Tên {curProfile.itemUnit}</label>
                  <input type="text" className="input" value={pForm.name} onChange={e => setPForm({ ...pForm, name: e.target.value })} />
                </div>

                <div className="form-group">
                  <label>{curProfile.departmentLabel}</label>
                  <select className="input" value={pForm.departmentId} onChange={e => setPForm({ ...pForm, departmentId: e.target.value })}>
                    <option value="">Chọn khu vực...</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label>{curProfile.startTimeLabel} (HH:mm:ss)</label>
                  <input type="text" className="input" value={pForm.startTime} onChange={e => setPForm({ ...pForm, startTime: e.target.value })} />
                </div>

                <div className="form-group">
                  <label>{curProfile.endTimeLabel} (HH:mm:ss)</label>
                  <input type="text" className="input" value={pForm.endTime} onChange={e => setPForm({ ...pForm, endTime: e.target.value })} />
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Âm thanh chuông</label>
                  <select className="input" value={pForm.audioFileId} onChange={e => setPForm({ ...pForm, audioFileId: e.target.value })}>
                    <option value="">Chọn file nhạc...</option>
                    {files.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Ngày trong tuần</label>
                  <DayPicker value={pForm.daysOfWeek} onChange={v => setPForm({ ...pForm, daysOfWeek: v })} />
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input type="checkbox" id="edit-p-active" checked={pForm.isActive} onChange={e => setPForm({ ...pForm, isActive: e.target.checked })} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                  <label htmlFor="edit-p-active" style={{ cursor: 'pointer', fontWeight: 600 }}>Kích hoạt mục này</label>
                </div>
              </div>

              <div className="btn-row" style={{ marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                <button className="btn btn-primary" onClick={savePeriod}>
                  {React.createElement('ion-icon', { name: 'save-outline' })} Lưu thay đổi
                </button>
                <button className="btn btn-ghost" onClick={() => { setEditingPeriod(null); setPForm({ name: '', departmentId: '', startTime: '', endTime: '', audioFileId: '', volume: 1.0, isActive: true, daysOfWeek: ALL_WEEKDAYS }); }}>
                  Hủy
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── Form tạo mục mới ─── */}
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h3>Thêm {curProfile.itemName.toLowerCase()} mới</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Tên {curProfile.itemUnit} (Vd: {curProfile.itemBaseDefault} 1)</label>
              <input type="text" className="input" value={pForm.name} onChange={e => setPForm({ ...pForm, name: e.target.value })} placeholder={`${curProfile.itemBaseDefault} 1`} />
            </div>
            <div className="form-group">
              <label>{curProfile.departmentLabel}</label>
              <select className="input" value={pForm.departmentId} onChange={e => setPForm({ ...pForm, departmentId: e.target.value })}>
                <option value="">Chọn khu vực...</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>{curProfile.startTimeLabel}</label>
              <input type="text" className="input" value={pForm.startTime} onChange={e => setPForm({ ...pForm, startTime: e.target.value })} placeholder="08:00:00" />
            </div>
            <div className="form-group">
              <label>{curProfile.endTimeLabel}</label>
              <input type="text" className="input" value={pForm.endTime} onChange={e => setPForm({ ...pForm, endTime: e.target.value })} placeholder="08:45:00" />
            </div>
            <div className="form-group">
              <label>Âm thanh chuông</label>
              <select className="input" value={pForm.audioFileId} onChange={e => setPForm({ ...pForm, audioFileId: e.target.value })}>
                <option value="">Chọn file nhạc...</option>
                {files.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Ngày trong tuần</label>
              <DayPicker value={pForm.daysOfWeek} onChange={v => setPForm({ ...pForm, daysOfWeek: v })} />
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-xs" onClick={() => setPForm({ ...pForm, daysOfWeek: ALL_WEEKDAYS })}>T2–T6</button>
                <button type="button" className="btn btn-xs" onClick={() => setPForm({ ...pForm, daysOfWeek: ALL_DAYS })}>Tất cả</button>
              </div>
            </div>
          </div>
          <div className="btn-row" style={{ marginTop: '1rem' }}>
            <button className="btn btn-primary" onClick={savePeriod}>
              {React.createElement('ion-icon', { name: 'add-outline', style: { marginRight: '6px' } })}
              Thêm {curProfile.itemUnit}
            </button>
          </div>
        </div>

        {/* ─── Tạo hàng loạt thông minh ─── */}
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h3>{React.createElement('ion-icon', { name: 'flash-outline', style: { marginRight: '8px', color: 'var(--accent)' } })}Tạo hàng loạt thông minh</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            <div className="form-group">
              <label>{curProfile.departmentLabel}</label>
              <select className="input" value={bulkDep} onChange={e => setBulkDep(e.target.value)}>
                <option value="">Chọn...</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Âm thanh chuông</label>
              <select className="input" value={bulkAudio} onChange={e => setBulkAudio(e.target.value)}>
                <option value="">Chọn...</option>
                {files.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Tiền tố tên (Vd: {curProfile.itemBaseDefault})</label>
              <input type="text" className="input" value={bulkBaseName} onChange={e => setBulkBaseName(e.target.value)} placeholder={curProfile.itemBaseDefault} />
            </div>
            <div className="form-group">
              <label>Số lượng {curProfile.itemUnit}</label>
              <input type="number" className="input" min={1} max={20} value={bulkCount} onChange={e => setBulkCount(Number(e.target.value))} />
            </div>
            <div className="form-group">
              <label>Giờ bắt đầu {curProfile.itemBaseDefault} 1</label>
              <input type="text" className="input" value={bulkStart} onChange={e => setBulkStart(e.target.value)} placeholder="07:00" />
            </div>
            <div className="form-group">
              <label>Độ dài mỗi {curProfile.itemUnit} (phút)</label>
              <input type="number" className="input" min={1} value={bulkDuration} onChange={e => setBulkDuration(Number(e.target.value))} />
            </div>
            <div className="form-group">
              <label>Nghỉ giữa {curProfile.itemUnit} (phút)</label>
              <input type="number" className="input" min={0} value={bulkBreak} onChange={e => setBulkBreak(Number(e.target.value))} />
            </div>
            <div className="form-group">
              <label>Ngày trong tuần</label>
              <DayPicker value={bulkDays} onChange={v => setBulkDays(v)} />
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" className={`btn btn-xs ${bulkDays === ALL_WEEKDAYS ? 'btn-primary' : ''}`} onClick={() => setBulkDays(ALL_WEEKDAYS)}>T2–T6</button>
                <button type="button" className={`btn btn-xs ${bulkDays === ALL_DAYS ? 'btn-primary' : ''}`} onClick={() => setBulkDays(ALL_DAYS)}>Tất cả</button>
              </div>
            </div>
            
            <div className="form-group" style={{ gridColumn: '1 / -1', borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '0.5rem' }}>
              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Nghỉ dài / Giữa ca / Nghỉ trưa</span>
                <button type="button" className="btn btn-xs btn-outline" onClick={() => setBulkLongBreaks([...bulkLongBreaks, { afterPeriod: 2, duration: 20 }])}>
                  + Thêm giờ nghỉ dài
                </button>
              </label>
              {bulkLongBreaks.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                  {bulkLongBreaks.map((lb, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                      <span style={{ fontSize: '0.85rem' }}>Sau {curProfile.itemBaseDefault}</span>
                      <input type="number" className="input" style={{ width: '60px', padding: '0.25rem', textAlign: 'center' }} min={1} value={lb.afterPeriod} onChange={e => {
                        const next = [...bulkLongBreaks];
                        next[idx].afterPeriod = Number(e.target.value);
                        setBulkLongBreaks(next);
                      }} />
                      <span style={{ fontSize: '0.85rem' }}>nghỉ hẳn</span>
                      <input type="number" className="input" style={{ width: '80px', padding: '0.25rem', textAlign: 'center' }} min={0} value={lb.duration} onChange={e => {
                        const next = [...bulkLongBreaks];
                        next[idx].duration = Number(e.target.value);
                        setBulkLongBreaks(next);
                      }} />
                      <span style={{ fontSize: '0.85rem' }}>phút</span>
                      <button type="button" style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={() => {
                        setBulkLongBreaks(bulkLongBreaks.filter((_, i) => i !== idx));
                      }} title="Xóa">
                        {React.createElement('ion-icon', { name: 'trash-outline' })}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
          <div className="btn-row" style={{ marginTop: '1rem' }}>
            <button className="btn btn-outline" onClick={generatePreview}>
              {React.createElement('ion-icon', { name: 'eye-outline', style: { marginRight: '6px' } })}Xem trước
            </button>
            {bulkPreview.length > 0 && <button className="btn btn-primary" onClick={saveBulk}>
              {React.createElement('ion-icon', { name: 'save-outline', style: { marginRight: '6px' } })}Lưu {bulkPreview.length} {curProfile.itemUnit}
            </button>}
            {bulkPreview.length > 0 && <button className="btn btn-ghost" onClick={() => setBulkPreview([])}>Xóa preview</button>}
          </div>

          {bulkPreview.length > 0 && (
            <div style={{ marginTop: '1rem', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ background: 'var(--card-bg)' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>Tên</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>{curProfile.startTimeLabel}</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>{curProfile.endTimeLabel}</th>
                  </tr>
                </thead>
                <tbody>
                  {bulkPreview.map((p, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '6px 12px', fontWeight: 600 }}>{p.name}</td>
                      <td style={{ padding: '6px 12px', textAlign: 'center', color: '#22c55e' }}>{fmtTime(p.startTime)}</td>
                      <td style={{ padding: '6px 12px', textAlign: 'center', color: '#ef4444' }}>{fmtTime(p.endTime)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ─── Danh sách mốc giờ ─── */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3>Danh sách {curProfile.itemUnit} ({periods.length})</h3>
            {selectedPeriods.length > 0 && (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '0.9rem' }}>Đã chọn {selectedPeriods.length} {curProfile.itemUnit}</span>
                <button className="btn btn-outline btn-sm" onClick={() => setShowBulkEditPeriod(true)}>
                  {React.createElement('ion-icon', { name: 'pencil-outline', style: { marginRight: '4px' } })} Sửa hàng loạt
                </button>
                <button className="btn btn-danger-ghost btn-sm" onClick={bulkDelete}>
                  {React.createElement('ion-icon', { name: 'trash-outline', style: { marginRight: '4px' } })} Xóa hàng loạt
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setSelectedPeriods([])}>Bỏ chọn</button>
              </div>
            )}
          </div>
          {periods.length === 0 && <div className="empty-state">Chưa có {curProfile.itemUnit} nào. Hãy tạo bằng form bên trên!</div>}
          {periods.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ background: 'var(--card-bg)' }}>
                    <th style={{ padding: '8px 12px', width: '32px' }}>
                      <input type="checkbox" checked={selectedPeriods.length === periods.length && periods.length > 0} onChange={toggleAll} />
                    </th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>Tên {curProfile.itemUnit}</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>{curProfile.startTimeLabel}</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>{curProfile.endTimeLabel}</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>{curProfile.departmentLabel}</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>Nhạc chuông</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>Ngày</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {periods.map(p => (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--border)', opacity: p.isActive ? 1 : 0.5 }}>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        <input type="checkbox" checked={selectedPeriods.includes(p.id)} onChange={() => toggleSelect(p.id)} />
                      </td>
                      <td style={{ padding: '8px 12px', fontWeight: 600, maxWidth: '160px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={p.name}>{p.name}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        <span style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>{fmtTime(p.startTime)}</span>
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        <span style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>{fmtTime(p.endTime)}</span>
                      </td>
                      <td style={{ padding: '8px 12px', maxWidth: '140px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={p.department?.name}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: p.department?.color || 'var(--primary)', display: 'inline-block', flexShrink: 0 }}></span>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.department?.name}</span>
                        </span>
                      </td>
                      <td style={{ padding: '8px 12px', color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: '180px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={p.audioFile?.name}>{p.audioFile?.name}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {p.daysOfWeek.split(',').map((d: string) => DAYS[Number(d)]).join(' ')}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                          <button className="btn btn-icon" title="Sửa" style={{ color: 'var(--accent)' }} onClick={() => openEdit(p)}>
                            {React.createElement('ion-icon', { name: 'create-outline' })}
                          </button>
                          <button className="btn btn-icon btn-danger-ghost" title="Xóa" onClick={() => deletePeriod(p.id)}>
                            {React.createElement('ion-icon', { name: 'trash-outline' })}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };
  
  // ── Users Management (Admin Only) ──────

  
  const [depName, setDepName] = useState('');
  const [depColor, setDepColor] = useState('#863bff');
  const [depEditId, setDepEditId] = useState<number | null>(null);

  const Departments = () => {

    const save = async () => {
      if (!depName) return notify('Tên không được để trống', 'err');
      try {
        if (depEditId) {
          await api.put(`/api/departments/${depEditId}`, { name: depName, color: depColor });
        } else {
          await api.post('/api/departments', { name: depName, color: depColor });
        }
        setDepName(''); setDepColor('#863bff'); setDepEditId(null);
        await loadAll();
        notify('Đã lưu khu vực');
      } catch {
        notify('Lỗi lưu khu vực', 'err');
      }
    };

    const remove = async (id: number) => {
      if (!(await customConfirm('Xóa khu vực này?'))) return;
      try {
        await api.delete(`/api/departments/${id}`);
        await loadAll();
      } catch {
        notify('Lỗi xóa (Có thể đang có chuông gắn với khu vực này)', 'err');
      }
    };

    return (
      <div className="admin-section">
        <h2>Phân loại / Khu vực</h2>
        <div className="card" style={{ maxWidth: '600px', marginBottom: '2rem' }}>
          <h3>Thêm khu vực mới</h3>
          <div className="form-group">
            <label>Tên phân loại (Vd: Tiểu học, Xưởng A)</label>
            <input type="text" className="input" value={depEditId ? '' : depName} onChange={e => setDepName(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Màu sắc hiển thị</label>
            
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
              {PREDEFINED_COLORS.map(c => (
                <div 
                  key={c} 
                  onClick={() => setDepColor(c)}
                  style={{ 
                    width: '32px', height: '32px', borderRadius: '50%', backgroundColor: c, 
                    cursor: 'pointer', border: depColor === c ? '2px solid white' : 'none',
                    boxShadow: depColor === c ? '0 0 0 2px var(--primary)' : 'none',
                    transition: 'all 0.2s ease'
                  }} 
                />
              ))}
            </div>

          </div>
          <div className="btn-row">
            <button className="btn btn-primary" onClick={save}>Thêm khu vực</button>
          </div>
        </div>

        <div className="card">
          <h3>Danh sách phân loại ({departments.length})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {departments.map(d => (
              <div key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', border: '1px solid var(--border)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: d.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1.2rem', flexShrink: 0, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                    {React.createElement('ion-icon', { name: guessIcon(d.name) })}
                  </div>

                  <strong style={{ fontSize: '1.1rem' }}>{d.name}</strong>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-icon" onClick={() => { setDepEditId(d.id); setDepName(d.name); setDepColor(d.color || '#863bff'); }}>
                    {React.createElement('ion-icon', { name: 'pencil-outline' })}
                  </button>
                  <button className="btn btn-icon btn-danger-ghost" onClick={() => remove(d.id)}>
                    {React.createElement('ion-icon', { name: 'trash-outline' })}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal sửa khu vực riêng lẻ */}
        {depEditId && (
          <div className="modal-overlay" style={{ zIndex: 1000 }}>
            <div className="modal-content" style={{ maxWidth: '450px', width: '100%' }}>
              <h3 style={{ marginTop: 0, marginBottom: '1.25rem' }}>Sửa khu vực</h3>
              <div className="form-group">
                <label>Tên phân loại</label>
                <input type="text" className="input" value={depName} onChange={e => setDepName(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Màu sắc hiển thị</label>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                  {PREDEFINED_COLORS.map(c => (
                    <div 
                      key={c} 
                      onClick={() => setDepColor(c)}
                      style={{ 
                        width: '32px', height: '32px', borderRadius: '50%', backgroundColor: c, 
                        cursor: 'pointer', border: depColor === c ? '2px solid white' : 'none',
                        boxShadow: depColor === c ? '0 0 0 2px var(--primary)' : 'none',
                        transition: 'all 0.2s ease'
                      }} 
                    />
                  ))}
                </div>
              </div>
              <div className="btn-row" style={{ marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                <button className="btn btn-primary" onClick={save}>Lưu thay đổi</button>
                <button className="btn btn-ghost" onClick={() => { setDepEditId(null); setDepName(''); setDepColor('#863bff'); }}>Hủy</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };
  const Users = () => {
    const handleCreateUser = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        await api.post('/api/users', newUser);
        notify('Đã tạo tài khoản');
        setShowUserForm(false);
        setNewUser({ username: '', password: '', role: 'OPERATOR' });
        fetchUsers();
      } catch (err: any) {
        notify(err.response?.data?.error || 'Lỗi tạo tài khoản', 'err');
      }
    };

    const deleteUser = async (id: number) => {
      if (!(await customConfirm('Xóa tài khoản này?'))) return;
      try {
        await api.delete(`/api/users/${id}`);
        notify('Đã xóa tài khoản');
        fetchUsers();
      } catch (err: any) {
        notify(err.response?.data?.error || 'Lỗi xóa', 'err');
      }
    };

    const changePassword = async (id: number) => {
      const newPassword = await customPrompt('Nhập mật khẩu mới:');
      if (!newPassword) return;
      try {
        await api.put(`/api/users/${id}`, { newPassword });
        notify('Đã đổi mật khẩu');
      } catch {
        notify('Lỗi đổi mật khẩu', 'err');
      }
    };

    const changeRole = async (id: number, currentRole: string) => {
      const newRole = currentRole === 'ADMIN' ? 'OPERATOR' : 'ADMIN';
      const roleName = newRole === 'ADMIN' ? 'Quản trị viên' : 'Vận hành';
      if (!(await customConfirm(`Đổi quyền người dùng này thành ${roleName}?`))) return;
      try {
        await api.put(`/api/users/${id}`, { role: newRole });
        notify('Đã đổi quyền');
        fetchUsers();
      } catch {
        notify('Lỗi đổi quyền', 'err');
      }
    };

    return (
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2>Quản lý Tài khoản</h2>
          <button className="btn btn-primary btn-sm" onClick={() => setShowUserForm(true)}>{React.createElement('ion-icon', { name: 'add-outline' })} Tạo tài khoản</button>
        </div>
        
        {showUserForm && (
          <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '400px', width: '100%' }}>
              <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: 'var(--text)' }}>Thêm tài khoản mới</h3>
              <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Tên đăng nhập</label>
                  <input type="text" className="input" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} required style={{ width: '100%', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Mật khẩu</label>
                  <input type="password" className="input" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} required style={{ width: '100%', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Phân quyền</label>
                  <select className="input" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})} style={{ width: '100%', boxSizing: 'border-box' }}>
                    <option value="OPERATOR">Vận hành</option>
                    <option value="ADMIN">Quản trị viên</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-outline" onClick={() => setShowUserForm(false)}>Hủy</button>
                  <button type="submit" className="btn btn-primary">Xác nhận</button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {usersList.map(u => (
            <div key={u.id} style={{
              background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.25rem',
              display: 'flex', flexDirection: 'column', gap: '0.75rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: '1.1rem' }}>{u.username}</strong>
                <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: u.role === 'ADMIN' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', color: u.role === 'ADMIN' ? '#ef4444' : '#10b981', fontWeight: 600 }}>
                  {u.role === 'ADMIN' ? 'Quản trị viên' : 'Vận hành'}
                </span>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Ngày tạo: {new Date(u.createdAt).toLocaleDateString('vi-VN')}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
                <button className="btn btn-outline btn-xs" style={{ flex: 1 }} onClick={() => changePassword(u.id)}>Đổi mật khẩu</button>
                <button className="btn btn-outline btn-xs" style={{ flex: 1 }} onClick={() => changeRole(u.id, u.role)}>Đổi quyền</button>
                <button className="btn btn-danger-ghost btn-xs" onClick={() => deleteUser(u.id)}>Xóa</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const SystemTab = () => (
    <div className="admin-section">
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.5rem' }}>
          {systemSubTab === 'devices' && 'Quản lý Thiết bị'}
          {systemSubTab === 'users' && 'Quản lý Tài khoản'}
          {systemSubTab === 'profile' && 'Cấu hình Tổ chức'}
        </h2>
      </div>

      {systemSubTab === 'profile' && (
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.75rem', maxWidth: '760px' }}>
          <h3 style={{ marginTop: 0, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent)' }}>
            {React.createElement('ion-icon', { name: 'business-outline' })} Cấu hình Loại hình Tổ chức
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Tự động tùy biến thuật ngữ (giao diện, menu, mốc thời gian, loại ca, phân khu) phù hợp với loại hình hoạt động của bạn.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {(Object.keys(ORG_PROFILES) as OrgMode[]).map((modeKey) => {
              const prof = ORG_PROFILES[modeKey];
              const isSelected = orgMode === modeKey;
              return (
                <div 
                  key={modeKey}
                  onClick={() => changeOrgMode(modeKey)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1.25rem',
                    padding: '1.15rem 1.35rem',
                    background: isSelected ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.02)',
                    border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border)',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <input 
                    type="radio" 
                    name="orgModeRadio"
                    checked={isSelected}
                    onChange={() => changeOrgMode(modeKey)}
                    style={{ accentColor: 'var(--accent)', width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <div style={{ fontSize: '1.8rem', color: isSelected ? 'var(--accent)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                    {React.createElement('ion-icon', { name: prof.icon })}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '1rem', color: isSelected ? '#fff' : 'var(--text)' }}>{prof.name}</div>
                    <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: '0.25rem', lineHeight: '1.4' }}>
                      Menu: <strong>{prof.tabLabel}</strong> • Mốc giờ: <strong>{prof.startTimeLabel} / {prof.endTimeLabel}</strong> • Phân loại: <strong>{prof.departmentLabel}</strong>
                    </div>
                  </div>
                  {isSelected && (
                    <span style={{ background: 'var(--accent)', color: '#fff', fontSize: '0.75rem', fontWeight: 600, padding: '0.25rem 0.75rem', borderRadius: '20px' }}>
                      Đang kích hoạt
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {systemSubTab === 'users' && Users()}
      {systemSubTab === 'devices' && Devices()}
    </div>
  );

  // ── Render ───────────────────────────
  let TABS = [
    { key: 'dashboard', icon: 'stats-chart-outline', label: 'Tổng quan' },
    { key: 'files', icon: 'folder-outline', label: 'Lưu trữ' },
    { key: 'playlists', icon: 'musical-notes-outline', label: 'Danh sách phát' },
    { key: 'schedules', icon: 'calendar-outline', label: 'Lịch phát' },
    { key: 'bells', icon: curProfile.icon, label: curProfile.tabLabel },
    { key: 'departments', icon: 'grid-outline', label: curProfile.departmentLabel }
  ] as any[];

  if (userRole === 'ADMIN') {
    TABS.push({ key: 'system', icon: 'settings-outline', label: 'Hệ thống' });
  }

  return (
    <div className="admin-root">
      <div className="mobile-header">
        <button className="mobile-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {React.createElement('ion-icon', { name: 'menu-outline' })}
        </button>
        <div style={{ fontWeight: 'bold' }}>Automation Audio System</div>
        <div style={{ width: '24px' }}></div>
      </div>
      <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)}></div>
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand" style={{ justifyContent: logoUrl ? 'center' : 'flex-start' }}>
          {logoUrl ? (
            <img src={logoUrl} alt="logo" className="sidebar-logo" />
          ) : (
            <div className="brand-title">
              <div style={{ fontSize: '1.5rem', color: 'var(--accent)' }}>{React.createElement('ion-icon', { name: 'notifications' })}</div>
              <div>
                <div className="brand-name">AAS Admin</div>
                <div className="brand-sub">by minhhan.net</div>
              </div>
            </div>
          )}
        </div>
        <nav className="sidebar-nav">
          {TABS.map(t => {
            if (t.key === 'system') {
              return (
                <div key={t.key} className="sidebar-submenu-group" style={{ display: 'flex', flexDirection: 'column' }}>
                  <button 
                    type="button" 
                    className={`nav-item ${tab === 'system' ? 'active' : ''}`}
                    onClick={() => {
                      if (tab !== 'system') setTab('system');
                      setSystemMenuOpen(prev => !prev);
                    }}
                    style={{ justifyContent: 'space-between' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      {React.createElement('ion-icon', { name: t.icon, style: { flexShrink: 0 } })}
                      <span>{t.label}</span>
                    </div>
                    {React.createElement('ion-icon', { 
                      name: systemMenuOpen ? 'chevron-down-outline' : 'chevron-forward-outline',
                      style: { fontSize: '0.85rem', opacity: 0.7, transition: 'transform 0.2s ease' }
                    })}
                  </button>

                  {systemMenuOpen && (
                    <div style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.2rem', marginTop: '0.2rem' }}>
                      <button 
                        type="button"
                        className={`nav-item sub-item ${tab === 'system' && systemSubTab === 'devices' ? 'active' : ''}`}
                        onClick={() => { setTab('system'); setSystemSubTab('devices'); setSidebarOpen(false); }}
                        style={{ fontSize: '0.85rem', padding: '0.45rem 0.75rem', borderRadius: '8px', minHeight: '36px' }}
                      >
                        {React.createElement('ion-icon', { name: 'hardware-chip-outline' })} <span>Thiết bị</span>
                      </button>
                      <button 
                        type="button"
                        className={`nav-item sub-item ${tab === 'system' && systemSubTab === 'users' ? 'active' : ''}`}
                        onClick={() => { setTab('system'); setSystemSubTab('users'); setSidebarOpen(false); }}
                        style={{ fontSize: '0.85rem', padding: '0.45rem 0.75rem', borderRadius: '8px', minHeight: '36px' }}
                      >
                        {React.createElement('ion-icon', { name: 'people-outline' })} <span>Tài khoản</span>
                      </button>
                      <button 
                        type="button"
                        className={`nav-item sub-item ${tab === 'system' && systemSubTab === 'profile' ? 'active' : ''}`}
                        onClick={() => { setTab('system'); setSystemSubTab('profile'); setSidebarOpen(false); }}
                        style={{ fontSize: '0.85rem', padding: '0.45rem 0.75rem', borderRadius: '8px', minHeight: '36px' }}
                      >
                        {React.createElement('ion-icon', { name: 'business-outline' })} <span>Tổ chức</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            }

            return (
              <button key={t.key} className={`nav-item ${tab === t.key ? 'active' : ''}`} onClick={() => { setTab(t.key); setSidebarOpen(false); }}>
                {React.createElement('ion-icon', { name: t.icon, style: { flexShrink: 0 } })} <span>{t.label}</span>
              </button>
            );
          })}
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
            <div style={{ fontWeight: 600, color: 'var(--text)' }}>Automation Audio System</div>
          </div>
        </div>
      </aside>

      <main className="admin-main" onClick={() => setSidebarOpen(false)}>
        <div className="admin-content">
          {tab === 'dashboard' && Dashboard()}
          {tab === 'files' && Files()}
          {tab === 'playlists' && Playlists()}
          {tab === 'schedules' && Schedules()}
          {tab === 'bells' && PeriodsTab()}
          {tab === 'departments' && Departments()}
          {tab === 'system' && userRole === 'ADMIN' && SystemTab()}
        </div>

        {msg && <div className={`admin-notify ${msg.type === 'err' ? 'err' : ''}`}>
          {msg.type === 'ok' ? React.createElement('ion-icon', { name: 'checkmark-circle' }) : React.createElement('ion-icon', { name: 'close-circle' })} 
          <span style={{marginLeft: '0.5rem'}}>{msg.text}</span>
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
