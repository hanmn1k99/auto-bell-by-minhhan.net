import { prisma } from './prisma';
import { Server } from 'socket.io';

let currentPlaylistState: {
  scheduleId: number | null;
  playlistId: number | null;
  playlistVolume: number | null;
  trackIndex: number;
  tracks: { path: string; name: string }[];
} = {
  scheduleId: null,
  playlistId: null,
  playlistVolume: null,
  trackIndex: 0,
  tracks: [],
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
            io.emit('STOP_AUDIO', {});
            currentPlaylistState = { scheduleId: null, playlistId: null, trackIndex: 0, tracks: [] };
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
  
  io.emit('PLAY_AUDIO', { 
    url: track.path, 
    name: track.name, 
    manual: currentPlaylistState.scheduleId === -1,
    scheduleId: currentPlaylistState.scheduleId !== -1 ? currentPlaylistState.scheduleId : undefined,
    trackIndex: currentPlaylistState.trackIndex,
    volume: volumeToPlay,
    isOverride: currentPlaylistState.playlistVolume !== null,
    targetTime: Date.now() + 2500
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
  handleTrackEnded(io);
}

export function stopPlayback(io: Server) {
  io.emit('STOP_AUDIO', {});
  currentPlaylistState = { scheduleId: null, playlistId: null, playlistVolume: null, trackIndex: 0, tracks: [] };
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
  };

  io.emit('PLAY_AUDIO', { url: file.path, name: file.name, manual: true, volume: globalVolume, isOverride: false });
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
      isOverride: state.playlistVolume !== null
    });
  } else {
    io.emit('SYNC_STATE', { currentTrack: null });
  }
}
