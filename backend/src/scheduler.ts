import { prisma } from './prisma';
import { Server } from 'socket.io';

let currentPlaylistState: {
  scheduleId: number | null;
  playlistId: number | null;
  playlistVolume: number | null;
  trackIndex: number;
  tracks: { path: string; name: string }[];
  status: 'playing' | 'paused' | 'stopped';
  targetTime: number | null;
  pauseOffset: number | null;
} = {
  scheduleId: null,
  playlistId: null,
  playlistVolume: null,
  trackIndex: 0,
  tracks: [],
  status: 'stopped',
  targetTime: null,
  pauseOffset: null,
};

let bellPlayedThisMinute: Set<string> = new Set();
let lastMinuteCheck = '';

let globalVolume: number = 1.0;

export function getGlobalVolume() {
  return globalVolume;
}

export function setGlobalVolume(io: Server, vol: number) {
  globalVolume = Math.max(0, Math.min(1, vol));
  io.emit('SET_VOLUME', { volume: globalVolume });
}

function getCurrentHHMM(): string {
  const now = new Date();
  const hh = now.getHours().toString().padStart(2, '0');
  const mm = now.getMinutes().toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

function getDayOfWeek(): number {
  // 0=Sun, 1=Mon, ..., 6=Sat
  return new Date().getDay();
}

function isDayActive(daysOfWeek: string): boolean {
  const day = getDayOfWeek();
  return daysOfWeek.split(',').map(Number).includes(day);
}

function isTimeInRange(startTime: string, endTime: string, currentTime: string): boolean {
  return currentTime >= startTime && currentTime < endTime;
}

export function startScheduler(io: Server) {
  console.log('[Scheduler] Started');

  setInterval(async () => {
    const now = getCurrentHHMM();

    // --- BELL CHECK (fires once per minute per bell) ---
    if (now !== lastMinuteCheck) {
      lastMinuteCheck = now;
      bellPlayedThisMinute.clear();

      try {
        const bells = await prisma.bellConfig.findMany({
          where: { isActive: true, time: now },
          include: { audioFile: true },
        });

        for (const bell of bells) {
          if (!isDayActive(bell.daysOfWeek)) continue;
          const key = `bell-${bell.id}`;
          if (bellPlayedThisMinute.has(key)) continue;
          bellPlayedThisMinute.add(key);

          console.log(`[Scheduler] Ringing bell: ${bell.type} at ${bell.time}`);
          io.emit('PLAY_BELL', {
            url: bell.audioFile.path,
            name: bell.audioFile.name,
            type: bell.type,
            targetTime: Date.now() + 2500
          });
        }
      } catch (err) {
        console.error('[Scheduler] Bell check error:', err);
      }

      // --- SCHEDULE CHECK ---
      if (currentPlaylistState.scheduleId === -1) return;

      try {
        const schedules = await prisma.schedule.findMany({
          where: { isActive: true },
          include: {
            playlist: {
              include: { items: { include: { audioFile: true }, orderBy: { order: 'asc' } } },
            },
          },
        });

        const activeSchedule = schedules.find(
          (s) => isTimeInRange(s.startTime, s.endTime, now) && isDayActive(s.daysOfWeek)
        );

        if (activeSchedule) {
          const tracks = activeSchedule.playlist.items.map((i) => ({
            path: i.audioFile.path,
            name: i.audioFile.name,
          }));

          if (tracks.length === 0) return;

          // New schedule started
          if (currentPlaylistState.scheduleId !== activeSchedule.id) {
            currentPlaylistState = {
              scheduleId: activeSchedule.id,
              playlistId: activeSchedule.playlistId,
              playlistVolume: activeSchedule.playlist.volume,
              trackIndex: 0,
              tracks,
            };
            playCurrentTrack(io);
          }
        } else {
          // No active schedule
          if (currentPlaylistState.scheduleId !== null && currentPlaylistState.scheduleId !== -1) {
            console.log('[Scheduler] No active schedule, stopping');
            stopPlayback(io);
          }
        }
      } catch (err) {
        console.error('[Scheduler] Schedule check error:', err);
      }
    }
  }, 5000); // Check every 5 seconds, but fires events only once per minute change
}

function playCurrentTrack(io: Server) {
  if (currentPlaylistState.tracks.length === 0) return;
  const track = currentPlaylistState.tracks[currentPlaylistState.trackIndex];
  const volumeToPlay = currentPlaylistState.playlistVolume ?? globalVolume;
  
  currentPlaylistState.status = 'playing';
  currentPlaylistState.targetTime = Date.now() + 2500;
  currentPlaylistState.pauseOffset = null;

  io.emit('PLAY_AUDIO', { 
    url: track.path, 
    name: track.name, 
    manual: currentPlaylistState.scheduleId === -1,
    scheduleId: currentPlaylistState.scheduleId !== -1 ? currentPlaylistState.scheduleId : undefined,
    trackIndex: currentPlaylistState.trackIndex,
    volume: volumeToPlay,
    isOverride: currentPlaylistState.playlistVolume !== null,
    targetTime: currentPlaylistState.targetTime
  });
  broadcastState(io);
}

export function handleTrackEnded(io: Server) {
  if (currentPlaylistState.tracks.length === 0) return;
  
  // Nếu là file đơn lẻ phát thủ công -> dừng
  if (currentPlaylistState.scheduleId === -1 && currentPlaylistState.tracks.length === 1) {
    stopPlayback(io);
    return;
  }
  
  // Phát playlist thủ công hoặc lịch trình -> nhảy bài tiếp theo
  currentPlaylistState.trackIndex = (currentPlaylistState.trackIndex + 1) % currentPlaylistState.tracks.length;
  playCurrentTrack(io);
}

// Manually trigger next track (called from admin)
export function playNextTrack(io: Server) {
  if (currentPlaylistState.tracks.length === 0) return;
  currentPlaylistState.trackIndex = (currentPlaylistState.trackIndex + 1) % currentPlaylistState.tracks.length;
  playCurrentTrack(io);
}

export function playPrevTrack(io: Server) {
  if (currentPlaylistState.tracks.length === 0) return;
  currentPlaylistState.trackIndex = (currentPlaylistState.trackIndex - 1 + currentPlaylistState.tracks.length) % currentPlaylistState.tracks.length;
  playCurrentTrack(io);
}

export function pausePlayback(io: Server) {
  if (currentPlaylistState.status !== 'playing' || !currentPlaylistState.targetTime) return;
  const exactNow = Date.now();
  // Nếu chưa kịp chạy (delay 2500ms) thì coi như pause ở giây 0
  currentPlaylistState.pauseOffset = Math.max(0, (exactNow - currentPlaylistState.targetTime) / 1000);
  currentPlaylistState.status = 'paused';
  io.emit('PAUSE_AUDIO');
  broadcastState(io);
}

export function resumePlayback(io: Server) {
  if (currentPlaylistState.status !== 'paused' || currentPlaylistState.pauseOffset === null) return;
  currentPlaylistState.status = 'playing';
  currentPlaylistState.targetTime = Date.now() + 2500 - currentPlaylistState.pauseOffset * 1000;
  
  const track = currentPlaylistState.tracks[currentPlaylistState.trackIndex];
  const volumeToPlay = currentPlaylistState.playlistVolume ?? globalVolume;
  
  io.emit('SYNC_STATE', { 
    currentTrack: track,
    volume: volumeToPlay,
    isOverride: currentPlaylistState.playlistVolume !== null,
    targetTime: currentPlaylistState.targetTime
  });
  broadcastState(io);
}

export function seekPlayback(io: Server, timeSeconds: number) {
  if (currentPlaylistState.tracks.length === 0) return;
  if (currentPlaylistState.status === 'paused') {
    currentPlaylistState.pauseOffset = timeSeconds;
    broadcastState(io);
  } else if (currentPlaylistState.status === 'playing') {
    currentPlaylistState.targetTime = Date.now() + 2500 - timeSeconds * 1000;
    const track = currentPlaylistState.tracks[currentPlaylistState.trackIndex];
    io.emit('SYNC_STATE', { 
      currentTrack: track,
      volume: currentPlaylistState.playlistVolume ?? globalVolume,
      isOverride: currentPlaylistState.playlistVolume !== null,
      targetTime: currentPlaylistState.targetTime
    });
    broadcastState(io);
  }
}

export function stopPlayback(io: Server) {
  io.emit('STOP_AUDIO', {});
  currentPlaylistState = { scheduleId: null, playlistId: null, playlistVolume: null, trackIndex: 0, tracks: [], status: 'stopped', targetTime: null, pauseOffset: null };
  broadcastState(io);
}

export async function playManualFile(io: Server, fileId: number) {
  const file = await prisma.audioFile.findUnique({ where: { id: fileId } });
  if (!file) throw new Error('File not found');

  currentPlaylistState = {
    scheduleId: -1, // -1 means manual mode
    playlistId: null,
    playlistVolume: null,
    trackIndex: 0,
    tracks: [{ path: file.path, name: file.name }],
    status: 'stopped',
    targetTime: null,
    pauseOffset: null,
  };

  playCurrentTrack(io);
}

export async function playManualPlaylist(io: Server, playlistId: number) {
  const playlist = await prisma.playlist.findUnique({
    where: { id: playlistId },
    include: { items: { include: { audioFile: true }, orderBy: { order: 'asc' } } },
  });
  if (!playlist) throw new Error('Playlist not found');

  const tracks = playlist.items.map(i => ({
    path: i.audioFile.path,
    name: i.audioFile.name,
  }));

  if (tracks.length === 0) throw new Error('Playlist is empty');

  currentPlaylistState = {
    scheduleId: -1,
    playlistId: playlist.id,
    playlistVolume: playlist.volume,
    trackIndex: 0,
    tracks,
    status: 'stopped',
    targetTime: null,
    pauseOffset: null,
  };

  const track = tracks[0];
  playCurrentTrack(io);
}

export function getCurrentState() {
  return { ...currentPlaylistState, volume: globalVolume };
}

export function broadcastState(io: Server) {
  const state = getCurrentState();
  if (state.tracks.length > 0) {
    const idx = Math.min(state.trackIndex, state.tracks.length - 1);
    io.emit('SYNC_STATE', { 
      currentTrack: state.tracks[idx],
      volume: state.playlistVolume ?? state.volume,
      isOverride: state.playlistVolume !== null,
      targetTime: state.targetTime,
      status: state.status,
      pauseOffset: state.pauseOffset,
      upNext: state.tracks.slice(idx + 1)
    });
  } else {
    io.emit('SYNC_STATE', { currentTrack: null, status: 'stopped', upNext: [] });
  }
}
