import { AdminContext } from './components/admin/AdminContext';
import { YouTubeTab } from './components/admin/YouTubeTab';

import { SystemTab } from './components/admin/SystemTab';

import { Users } from './components/admin/Users';

import { Departments } from './components/admin/Departments';

import { PeriodsTab } from './components/admin/PeriodsTab';

import { Schedules } from './components/admin/Schedules';

import { Files } from './components/admin/Files';

import { Devices } from './components/admin/Devices';

import { RightSidebar } from './components/admin/RightSidebar';

import { Dashboard } from './components/admin/Dashboard';

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
export interface Schedule { id: number; name: string; startTime: string; endTime: string; playlistId: number; playlist: Playlist; isActive: boolean; daysOfWeek: string; }
interface Department { id: number; name: string; color: string; description?: string; soundCardId?: string; }
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
  departmentIcon: string;
  batchDescription: string;
}> = {
  GENERAL: {
    name: 'Tùy chỉnh / Tổng hợp',
    icon: 'time-outline',
    tabLabel: 'Quản lý khung giờ',
    itemUnit: 'khung giờ',
    itemName: 'Khung giờ',
    itemBaseDefault: 'Khung',
    startTimeLabel: 'Giờ bắt đầu',
    endTimeLabel: 'Giờ kết thúc',
    startBellLabel: 'Bắt đầu',
    endBellLabel: 'Kết thúc',
    departmentLabel: 'Phân loại',
    departmentIcon: 'grid-outline',
    batchDescription: 'Tự động tạo danh sách mốc thời gian báo chuông...'
  },
  SCHOOL: {
    name: 'Trường học (Tiết học)',
    icon: 'school-outline',
    tabLabel: 'Quản lý tiết học',
    itemUnit: 'tiết',
    itemName: 'Tiết học',
    itemBaseDefault: 'Tiết',
    startTimeLabel: 'Giờ vào tiết',
    endTimeLabel: 'Giờ ra tiết',
    startBellLabel: 'Vào tiết',
    endBellLabel: 'Ra tiết',
    departmentLabel: 'Khối lớp',
    departmentIcon: 'library-outline',
    batchDescription: 'Tự động tạo danh sách tiết học theo ca sáng/chiều...'
  },
  OFFICE: {
    name: 'Cơ quan / Văn phòng',
    icon: 'briefcase-outline',
    tabLabel: 'Quản lý phân ca',
    itemUnit: 'ca làm việc',
    itemName: 'Ca hành chính',
    itemBaseDefault: 'Ca',
    startTimeLabel: 'Giờ vào làm',
    endTimeLabel: 'Giờ tan làm',
    startBellLabel: 'Vào giờ làm',
    endBellLabel: 'Tan giờ làm',
    departmentLabel: 'Phòng ban',
    departmentIcon: 'people-circle-outline',
    batchDescription: 'Tự động tạo danh sách Ca làm việc hành chính (Vào sáng, Nghỉ trưa, Vào chiều, Tan làm)...'
  },
  FACTORY: {
    name: 'Nhà máy / Xí nghiệp',
    icon: 'construct-outline',
    tabLabel: 'Quản lý phân ca',
    itemUnit: 'ca sản xuất',
    itemName: 'Ca sản xuất',
    itemBaseDefault: 'Ca',
    startTimeLabel: 'Giờ vào ca',
    endTimeLabel: 'Giờ giao ca',
    startBellLabel: 'Vào ca sản xuất',
    endBellLabel: 'Giao ca / Tan ca',
    departmentLabel: 'Phân xưởng',
    departmentIcon: 'cube-outline',
    batchDescription: 'Tự động tạo danh sách Phân ca kíp sản xuất (Ca 1, Ca 2, Ca 3, Giờ đổi ca liên tục)...'
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

function MiniPlayerProgress({ nowPlaying, mediaDuration, api }: { nowPlaying: any, mediaDuration: number, api: any }) {
  const [mediaCurrentTime, setMediaCurrentTime] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);

  useEffect(() => {
    const t = setInterval(() => {
      if (!nowPlaying) {
        setMediaCurrentTime(0);
        return;
      }
      
      const isPlaying = nowPlaying.status === 'playing';
      if (isPlaying) {
        const elapsed = Math.floor((Date.now() - (nowPlaying.targetTime || Date.now())) / 1000);
        if (!isSeeking) setMediaCurrentTime(Math.max(0, Math.min(elapsed, mediaDuration || elapsed)));
      }
    }, 1000);
    return () => clearInterval(t);
  }, [nowPlaying, mediaDuration, isSeeking]);

  useEffect(() => {
    if (nowPlaying?.status === 'paused' && nowPlaying.pauseOffset != null && !isSeeking) {
      setMediaCurrentTime(nowPlaying.pauseOffset);
    }
  }, [nowPlaying, isSeeking]);

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    setMediaCurrentTime(time);
    api.post('/api/admin/seek', { time }).catch(() => {});
  };

  return (
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
  );
}

// ── Admin Page ─────────────────────────
export default function AdminPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'dashboard' | 'files' | 'playlists' | 'schedules' | 'bells' | 'departments' | 'devices' | 'settings' | 'users' | 'system' | 'livestream' | 'youtube'>('dashboard');
  const [systemSubTab, setSystemSubTab] = useState<'profile' | 'users' | 'devices'>('devices');
  
  useEffect(() => {
    // Removed localStorage saving to prevent confusing position behavior
  }, [tab]);

  useEffect(() => {
    // Removed localStorage saving for subtab
  }, [systemSubTab]);

  const [systemMenuOpen, setSystemMenuOpen] = useState(false);
  const [systemHovered, setSystemHovered] = useState(false);
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
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);
  const [volume, setVolume] = useState<number>(1.0);
  const [globalFadeInDuration, setGlobalFadeInDuration] = useState<number>(1);
  const [orgMode, setOrgMode] = useState<OrgMode>(() => (localStorage.getItem('org_mode') as OrgMode) || 'GENERAL');

  // ── HOISTED HOOKS ──
  const socketRef = useRef<any>(null);
  if (!socketRef.current) {
    socketRef.current = io({ auth: { token: localStorage.getItem('token') || sessionStorage.getItem('token') } });
  }
  const socket = socketRef.current;
  const [fileUploading, setFileUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [selectedFileIds, setSelectedFileIds] = useState<number[]>([]);
  const [addFileId, setAddFileId] = useState('');
  const [newSchName, setNewSchName] = useState('');
  const [selectedSch, setSelectedSch] = useState<Schedule | null>(null);
  React.useEffect(() => {
    if (selectedSch) {
      const updated = schedules.find(x => x.id === selectedSch.id);
      if (updated) setSelectedSch(updated);
    }
  }, [schedules]);
  const [pForm, setPForm] = React.useState({ name: '', departmentId: '', startTime: '', endTime: '', audioFileId: '', volume: 1.0, isActive: true, daysOfWeek: ALL_WEEKDAYS });
  const [editingPeriod, setEditingPeriod] = React.useState<any | null>(null);
  const [selectedPeriods, setSelectedPeriods] = React.useState<number[]>([]);
  const [showBulkEditPeriod, setShowBulkEditPeriod] = useState(false);
  const [bulkEditPeriodForm, setBulkEditPeriodForm] = useState({ audioFileId: '', departmentId: '', daysOfWeek: '', isActive: 'no-change' });
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
  const [depName, setDepName] = useState('');
  const [depColor, setDepColor] = useState('#863bff');
  const [depSoundCardId, setDepSoundCardId] = useState('default');
  const [depEditId, setDepEditId] = useState<number | null>(null);
  const [availableSoundCards, setAvailableSoundCards] = useState<{ deviceId: string, deviceName: string, cards: { deviceId: string, label: string }[] }[]>([]);
  const [isSimulatorMode, setIsSimulatorMode] = useState<boolean>(() => {
    return localStorage.getItem('isSimulatorMode') === 'true';
  });
  const [ytUrl, setYtUrl] = useState('');

  const [ytPlayingVideo, setYtPlayingVideo] = useState(false);
  const [ytPlayingTitle, setYtPlayingTitle] = useState('');
  const [ytCCOn, setYtCCOn] = useState(false);
  const [ytVideoPaused, setYtVideoPaused] = useState(false);
  const [ytSearchResults, setYtSearchResults] = useState<any[]>([]);
  const [ytSearching, setYtSearching] = useState(false);
  const [inlinePreviewId, setInlinePreviewId] = useState<string | null>(null);

  
  const fetchSchedules = () => api.get('/api/schedules').then(r => setSchedules(Array.isArray(r.data) ? r.data : []));
  const fetchPeriods = () => api.get('/api/periods').then(r => setPeriods(Array.isArray(r.data) ? r.data : []));
  const fetchDepartments = () => api.get('/api/departments').then(r => setDepartments(Array.isArray(r.data) ? r.data : []));
  const fetchFiles = () => api.get('/api/files').then(r => setFiles(Array.isArray(r.data) ? r.data : []));

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
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      setPlayingPreviewSrc(null);
    }
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

  useEffect(() => {
    document.title = 'AAS | Dashboard';
  }, []);

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

  const customPrompt = (message: string, defaultValue: string = ''): Promise<string | null> => {
    return new Promise((resolve) => {
      setDialog({
        message, type: 'prompt', defaultValue,
        onConfirm: (val?: string) => { setDialog(null); resolve(val || null); },
        onCancel: () => { setDialog(null); resolve(null); }
      });
    });
  };

  const [playingPreviewSrc, setPlayingPreviewSrc] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const togglePreview = (src: string) => {
    if (playingPreviewSrc === src) {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
      setPlayingPreviewSrc(null);
    } else {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
      const audio = new Audio(src);
      previewAudioRef.current = audio;
      audio.onended = () => setPlayingPreviewSrc(null);
      audio.onpause = () => {
        if (previewAudioRef.current === audio) {
          setPlayingPreviewSrc(null);
        }
      };
      audio.play().catch(() => setPlayingPreviewSrc(null));
      setPlayingPreviewSrc(src);
    }
  };

  useEffect(() => {
    return () => {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
    };
  }, []);

  const MiniPlayer = ({ src }: { src: string }) => {
    const isPlaying = playingPreviewSrc === src;
    return (
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button 
          type="button"
          className={`btn btn-xs ${isPlaying ? 'btn-primary' : 'btn-outline'}`} 
          style={{ width: '32px', height: '32px', padding: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
          onClick={() => togglePreview(src)} 
          title={isPlaying ? 'Dừng nghe thử' : 'Nghe thử'}
        >
          {isPlaying ? React.createElement('ion-icon', { name: 'pause' }) : React.createElement('ion-icon', { name: 'play' })}
        </button>
      </div>
    );
  };

  const loadAll = async () => {
    try {
      const [f, p, s, b, a, state, deps, prs] = await Promise.all([
        api.get('/api/files').catch(() => ({ data: [] })),
        api.get('/api/playlists').catch(() => ({ data: [] })),
        api.get('/api/schedules').catch(() => ({ data: [] })),
        api.get('/api/bells').catch(() => ({ data: [] })),
        api.get('/api/files/assets/info').catch(() => ({ data: {} })),
        api.get('/api/admin/state').catch(() => ({ data: {} })),
        api.get('/api/departments').catch(() => ({ data: [] })),
        api.get('/api/periods').catch(() => ({ data: [] }))
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
      if (a.data.favicon) setFaviconUrl(`${API_URL}${a.data.favicon}`);
      if (state.data.volume !== undefined) setVolume(state.data.volume);
      if (state.data.fadeInDuration !== undefined) setGlobalFadeInDuration(state.data.fadeInDuration);
    } catch {}
  };

  const [nowPlaying, setNowPlaying] = useState<{name: string, url: string, isOverride?: boolean, status?: string, targetTime?: number | null, pauseOffset?: number | null, upNext?: {name: string, path: string}[]} | null>(null);
  const [bellPlaying, setBellPlaying] = useState<{name: string, type: string} | null>(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [mediaDuration, setMediaDuration] = useState(0);

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
      if (data.youtubeState) {
        setYtPlayingVideo(true);
        setYtVideoPaused(data.youtubeState.status === 'paused');
        setYtPlayingTitle(data.youtubeState.title || '');
        setYtCCOn(!!data.youtubeState.isCCOn);
      } else {
        setYtPlayingVideo(false);
        setYtPlayingTitle('');
      }

      if (data.currentTrack && data.status !== 'stopped') {
        setNowPlaying((prev: any) => {
          const next = { 
            name: String(data.currentTrack?.name ?? ''), 
            url: String(data.currentTrack?.path ?? ''), 
            isOverride: data.isOverride,
            status: String(data.status ?? ''),
            targetTime: data.targetTime,
            pauseOffset: data.pauseOffset,
            upNext: Array.isArray(data.upNext) 
              ? data.upNext.map((t: any) => ({ name: String(t?.name ?? ''), path: String(t?.path ?? '') }))
              : []
          };
          if (prev && prev.name === next.name && prev.status === next.status && prev.targetTime === next.targetTime && prev.pauseOffset === next.pauseOffset) {
            return prev;
          }
          return next;
        });
      } else {
        setNowPlaying(null);
      }
      if (data.volume !== undefined) setVolume(data.volume);
    });
    socket.on('PLAY_AUDIO', (data: any) => setNowPlaying(prev => ({
      ...(prev || {}), name: String(data?.name ?? ''), url: String(data?.url ?? ''), isOverride: data?.isOverride, status: 'playing', targetTime: data?.targetTime, upNext: prev?.upNext || []
    })));
    socket.on('STOP_AUDIO', () => setNowPlaying(null));
    socket.on('PAUSE_AUDIO', () => {
      setNowPlaying(prev => prev ? { ...prev, status: 'paused' } : null);
    });
    socket.on('PLAY_YOUTUBE_VIDEO', (data: any) => {
      setYtPlayingVideo(true);
      setYtVideoPaused(false);
      setYtPlayingTitle(data.title || '');
    });
    socket.on('PAUSE_YOUTUBE_VIDEO', () => {
      setYtVideoPaused(true);
    });
    socket.on('RESUME_YOUTUBE_VIDEO', () => {
      setYtVideoPaused(false);
    });
    socket.on('STOP_YOUTUBE_VIDEO', () => {
      setNowPlaying(null);
      setYtVideoPaused(false);
    });
    socket.on('PLAY_BELL', (data: any) => {
      setBellPlaying({ name: String(data?.name ?? ''), type: String(data?.type ?? '') });
      setTimeout(() => setBellPlaying(null), 10000); // Ẩn chuông báo sau 10s trên admin
    });
      socket.on('DEVICES_UPDATED', () => api.get('/api/devices').then(r => setDevices(r.data)));
      socket.on('SET_VOLUME', (data) => setVolume(data.volume));
      socket.on('SET_FADE_IN', (data) => setGlobalFadeInDuration(data.fadeInDuration));
      socket.on('AVAILABLE_SOUND_CARDS', (cards) => {
        setAvailableSoundCards(cards);
      });
      
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
    
    socket.emit('SET_FADE_IN', safeVal);
  };

  const playManual = async (type: 'file' | 'playlist', id: number) => {
    try {
      if (type === 'file') {
        await api.post(`/api/admin/play-file/${id}`);
        // notify('Đã phát tệp âm thanh');
      } else if (type === 'playlist') {
        await api.post(`/api/admin/play-playlist/${id}`);
        // notify('Đã phát playlist');
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
  // ── Files ────────────────────────────
// HOISTED
// HOISTED
// HOISTED
// HOISTED

  // ── Lịch Phát (Đã Gộp Chức Năng Playlists) ─────────────────────────
// HOISTED
// HOISTED
  // --- Periods state ---
// HOISTED
// HOISTED
// HOISTED
// HOISTED
// HOISTED

  // Bulk generator state
// HOISTED
// HOISTED
// HOISTED
// HOISTED
// HOISTED
// HOISTED
// HOISTED
// HOISTED
// HOISTED
// HOISTED



  // ── ── ── ── ── ── ── ── ── ── ── ── ── ── ──
  // ── Users Management (Admin Only) ──────

  
// HOISTED
// HOISTED
// HOISTED
// HOISTED

// HOISTED

// HOISTED
// HOISTED
// HOISTED

  const getSoundCardName = (scId: string) => {
    if (scId === 'all') return 'Tất cả kênh (Phát toàn bộ)';
    if (scId === 'card-1') return 'Kênh 1 (Loa Trái)';
    if (scId === 'card-2') return 'Kênh 2 (Loa Phải)';
    if (scId === 'default') return 'Mặc định hệ thống';
    
    // Format is deviceId::cardId
    const parts = scId.split('::');
    if (parts.length === 2) {
      const [deviceId, cardId] = parts;
      const device = availableSoundCards.find(d => d.deviceId === deviceId);
      if (device) {
        const card = device.cards.find(c => c.deviceId === cardId);
        if (card) {
          return `${device.deviceName} - ${card.label}`;
        }
      }
    }
    
    return 'Mặc định hệ thống';
  };

  const getSoundCardIcon = (scId?: string) => {
    if (scId === 'all') return 'mega-phone-outline';
    if (scId === 'card-1' || scId === 'card-2') return 'headset-outline';
    return 'volume-high-outline';
  };

  const triggerLiveTestBell = async (scId: string) => {
    try {
      await api.post('/api/admin/test-sound-card', { soundCardId: scId });
      notify(`Đã gửi tín hiệu chuông thử nghiệm sang màn hình Player (${getSoundCardName(scId)})`);
    } catch (err: any) {
      notify(err.response?.data?.error || 'Lỗi gửi tín hiệu thử nghiệm sang Player', 'err');
    }
  };
  // ── YouTube Tab ──────────────────────
// HOISTED
// HOISTED
// HOISTED
// HOISTED
// HOISTED
// HOISTED
// HOISTED

  const handleYtInputKeyDown = async (e: React.KeyboardEvent | any) => {
    if (e.key === 'Enter') {
      const trimmed = ytUrl.trim();
      if (!trimmed) return;
      setYtSearching(true);
      try {
        const res = await api.post('/api/youtube/search', { q: trimmed });
        setYtSearchResults(res.data);
      } catch (err: any) {
        notify(err.response?.data?.error || 'Lỗi tìm kiếm YouTube', 'err');
      } finally {
        setYtSearching(false);
      }
    }
  };

  const fastPlayYt = async (video: any) => {
    try {
      await api.post('/api/youtube/play-video', { videoId: video.videoId, title: video.title });
      setYtPlayingVideo(true);
      setYtVideoPaused(false);
      notify('🔴 Đã phát Video YouTube trực tiếp lên màn hình Player!');
    } catch (err: any) {
      notify(err.response?.data?.error || 'Lỗi phát Video YouTube', 'err');
    }
  };

  



  const pauseYtVideoOnPlayer = async () => {
    try {
      await api.post('/api/youtube/pause-video');
      setYtVideoPaused(true);
      // notify('Đã tạm dừng Video YouTube trên Player');
    } catch {
      notify('Lỗi tạm dừng Video', 'err');
    }
  };

  const resumeYtVideoOnPlayer = async () => {
    try {
      await api.post('/api/youtube/resume-video');
      setYtVideoPaused(false);
      // notify('Đã tiếp tục phát Video YouTube trên Player');
    } catch {
      notify('Lỗi phát tiếp Video', 'err');
    }
  };

  const stopYtVideoOnPlayer = async () => {
    try {
      await api.post('/api/youtube/stop-video');
      setYtPlayingVideo(false);
      setYtVideoPaused(false);
      // notify('Đã dừng phát & thoát Video YouTube trên Player');
    } catch {
      notify('Lỗi gửi lệnh dừng Video', 'err');
    }
  };
  // ── Render ───────────────────────────
  let TABS = [
    { key: 'dashboard', icon: 'stats-chart-outline', label: 'Tổng Quan' },
    { key: 'files', icon: 'folder-outline', label: 'Kho Lưu Trữ' },
    { key: 'youtube', icon: 'logo-youtube', label: 'YouTube' },
    { key: 'schedules', icon: 'calendar-outline', label: 'Playlist' },
    { key: 'bells', icon: curProfile.icon, label: curProfile.tabLabel },
    { key: 'departments', icon: curProfile.departmentIcon || 'grid-outline', label: curProfile.departmentLabel }
  ] as any[];

  if (userRole === 'ADMIN') {
    TABS.push({ key: 'system', icon: 'settings-outline', label: 'Hệ Thống' });
  }

  // ── DEBUG: Deep safety check before render ──
  // Recursively walk all values that will be rendered to find the offending object

  // Log first render data for debugging
  if ((window as any).__adminDebugOnce !== true) {
    (window as any).__adminDebugOnce = true;
    console.log('[AdminPage] Initial state dump:', JSON.stringify({
      filesCount: files.length,
      playlistsCount: playlists.length,
      schedulesCount: schedules.length,
      bellsCount: bells.length,
      periodsCount: periods.length,
      nowPlaying,
      bellPlaying,
      tab,
      orgMode,
    }));
  }

  const contextValue = { tab, setTab, files, setFiles, schedules, setSchedules, bells, setBells, departments, setDepartments, periods, setPeriods, devices, setDevices, usersList, setUsersList, msg, setMsg, logoUrl, setLogoUrl, faviconUrl, setFaviconUrl, volume, setVolume, globalFadeInDuration, setGlobalFadeInDuration, orgMode, setOrgMode, fileUploading, setFileUploading, uploadProgress, setUploadProgress, selectedFileIds, setSelectedFileIds, addFileId, setAddFileId, newSchName, setNewSchName, selectedSch, setSelectedSch, pForm, setPForm, editingPeriod, setEditingPeriod, selectedPeriods, setSelectedPeriods, showBulkEditPeriod, setShowBulkEditPeriod, bulkEditPeriodForm, setBulkEditPeriodForm, bulkDep, setBulkDep, bulkAudio, setBulkAudio, bulkCount, setBulkCount, bulkStart, setBulkStart, bulkDuration, setBulkDuration, bulkBreak, setBulkBreak, bulkLongBreaks, setBulkLongBreaks, bulkDays, setBulkDays, bulkBaseName, setBulkBaseName, bulkPreview, setBulkPreview, depName, setDepName, depColor, setDepColor, depSoundCardId, setDepSoundCardId, depEditId, setDepEditId, availableSoundCards, setAvailableSoundCards, isSimulatorMode, setIsSimulatorMode, ytUrl, setYtUrl, ytPlayingVideo, setYtPlayingVideo, ytPlayingTitle, setYtPlayingTitle, ytCCOn, setYtCCOn, ytVideoPaused, setYtVideoPaused, ytSearchResults, setYtSearchResults, ytSearching, setYtSearching, inlinePreviewId, setInlinePreviewId, dialog, setDialog, playingPreviewSrc, setPlayingPreviewSrc, nowPlaying, setNowPlaying, bellPlaying, setBellPlaying, sidebarOpen, setSidebarOpen, mediaDuration, setMediaDuration, api, notify, userRole, curProfile, DAYS, ALL_WEEKDAYS, ALL_DAYS, systemMenuOpen, setSystemMenuOpen, systemHovered, setSystemHovered, showUserForm, setShowUserForm, newUser, setNewUser, systemSubTab, setSystemSubTab, playlists, playManual, queueManual, fetchDepartments, customConfirm, getSoundCardName, triggerLiveTestBell, PREDEFINED_COLORS, guessIcon, getSoundCardIcon, customPrompt, updateDevice, deleteDevice, fetchDevices, fetchFiles, API_URL, MiniPlayer, fetchPeriods, DayPicker, MiniPlayerProgress, handleVolumeChange, handleFadeInChange, fetchSchedules, ORG_PROFILES, changeOrgMode, fetchUsers, resumeYtVideoOnPlayer, pauseYtVideoOnPlayer, stopYtVideoOnPlayer, handleYtInputKeyDown, fastPlayYt };
  return (
    <AdminContext.Provider value={contextValue}>
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
              const isSubmenuVisible = systemMenuOpen || systemHovered;
              return (
                <div 
                  key={t.key} 
                  className="sidebar-submenu-group" 
                  style={{ display: 'flex', flexDirection: 'column' }}
                  onMouseEnter={() => setSystemHovered(true)}
                  onMouseLeave={() => setSystemHovered(false)}
                >
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
                      name: isSubmenuVisible ? 'chevron-down-outline' : 'chevron-forward-outline',
                      style: { fontSize: '0.85rem', opacity: 0.7, transition: 'transform 0.2s ease' }
                    })}
                  </button>

                  {isSubmenuVisible && (
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
                        {React.createElement('ion-icon', { name: 'options-outline' })} <span>Cấu hình</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            }

            return (
              <button 
                key={t.key} 
                className={`nav-item ${tab === t.key ? 'active' : ''}`} 
                onClick={() => { 
                  setTab(t.key); 
                  setSystemMenuOpen(false); 
                  setSystemHovered(false); 
                  setSidebarOpen(false); 
                }}
              >
                {React.createElement('ion-icon', { name: t.icon, style: { flexShrink: 0 } })} <span>{t.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="sidebar-footer">

          <a 
            href="/player" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="nav-item"
            onClick={(e) => {
              e.preventDefault();
              window.open('/player', '_blank');
            }}
          >
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
          {tab === 'dashboard' && <Dashboard />}
          {tab === 'files' && <Files />}
          {tab === 'youtube' && <YouTubeTab />}
          {tab === 'schedules' && <Schedules />}
          {tab === 'bells' && <PeriodsTab />}
          {tab === 'departments' && <Departments />}
          {tab === 'system' && userRole === 'ADMIN' && <SystemTab />}
        </div>

        {msg && <div className={`admin-notify ${msg.type === 'err' ? 'err' : ''}`}>
          {msg.type === 'ok' ? React.createElement('ion-icon', { name: 'checkmark-circle' }) : React.createElement('ion-icon', { name: 'close-circle' })} 
          <span style={{marginLeft: '0.5rem'}}>{String(msg.text)}</span>
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
                <button className="btn btn-primary" autoFocus={dialog.type !== 'prompt'} onClick={() => {
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
        {<RightSidebar />}
      </aside>
    </div>
    </AdminContext.Provider>
  );
}
