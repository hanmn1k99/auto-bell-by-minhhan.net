import { prisma } from './prisma';
import { Server } from 'socket.io';

let currentPlaylistState: {
  scheduleId: number | null;
  playlistId: number | null;
  trackIndex: number;
  tracks: { path: string; name: string }[];
} = {
  scheduleId: null,
  playlistId: null,
  trackIndex: 0,
  tracks: [],
};

let bellPlayedThisMinute: Set<string> = new Set();
let lastMinuteCheck = '';

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
          });
        }
      } catch (err) {
        console.error('[Scheduler] Bell check error:', err);
      }

      // --- SCHEDULE CHECK ---
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
              trackIndex: 0,
              tracks,
            };
          }

          // Send current track to play
          const track = currentPlaylistState.tracks[currentPlaylistState.trackIndex % currentPlaylistState.tracks.length];
          console.log(`[Scheduler] Playing track: ${track.name}`);
          io.emit('PLAY_AUDIO', {
            url: track.path,
            name: track.name,
            scheduleId: activeSchedule.id,
            trackIndex: currentPlaylistState.trackIndex,
          });

          // Advance to next track for next minute
          currentPlaylistState.trackIndex =
            (currentPlaylistState.trackIndex + 1) % currentPlaylistState.tracks.length;
        } else {
          // No active schedule
          if (currentPlaylistState.scheduleId !== null) {
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

// Manually trigger next track (called from admin)
export function playNextTrack(io: Server) {
  if (currentPlaylistState.tracks.length === 0) return;
  currentPlaylistState.trackIndex =
    (currentPlaylistState.trackIndex + 1) % currentPlaylistState.tracks.length;
  const track = currentPlaylistState.tracks[currentPlaylistState.trackIndex];
  io.emit('PLAY_AUDIO', { url: track.path, name: track.name, manual: true });
}

export function stopPlayback(io: Server) {
  io.emit('STOP_AUDIO', {});
  currentPlaylistState = { scheduleId: null, playlistId: null, trackIndex: 0, tracks: [] };
}

export function getCurrentState() {
  return currentPlaylistState;
}
