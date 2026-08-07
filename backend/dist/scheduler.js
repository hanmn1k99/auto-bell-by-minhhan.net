"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGlobalVolume = getGlobalVolume;
exports.setGlobalVolume = setGlobalVolume;
exports.getGlobalFadeInDuration = getGlobalFadeInDuration;
exports.setGlobalFadeInDuration = setGlobalFadeInDuration;
exports.reloadScheduleCache = reloadScheduleCache;
exports.startScheduler = startScheduler;
exports.handleTrackEnded = handleTrackEnded;
exports.playNextTrack = playNextTrack;
exports.playPrevTrack = playPrevTrack;
exports.pausePlayback = pausePlayback;
exports.resumePlayback = resumePlayback;
exports.seekPlayback = seekPlayback;
exports.stopPlayback = stopPlayback;
exports.playManualFile = playManualFile;
exports.queueManualFile = queueManualFile;
exports.playManualPlaylist = playManualPlaylist;
exports.queueManualPlaylist = queueManualPlaylist;
exports.getCurrentState = getCurrentState;
exports.broadcastState = broadcastState;
const prisma_1 = require("./prisma");
let currentPlaylistState = {
    scheduleId: null,
    playlistId: null,
    playlistVolume: null,
    trackIndex: 0,
    tracks: [],
    status: 'stopped',
    targetTime: null,
    pauseOffset: null,
};
let bellPlayedThisSecond = new Set();
let lastSecondCheck = '';
let globalVolume = 1.0;
let globalFadeInDuration = 1; // in seconds
function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}
function getGlobalVolume() {
    return globalVolume;
}
function setGlobalVolume(io, vol) {
    const safeVol = Math.max(0, Math.min(1, vol));
    globalVolume = safeVol;
    if (currentPlaylistState.playlistVolume !== null) {
        currentPlaylistState.playlistVolume = safeVol;
    }
    io.to('approved').emit('SET_VOLUME', { volume: safeVol });
}
function getGlobalFadeInDuration() {
    return globalFadeInDuration;
}
function setGlobalFadeInDuration(io, duration) {
    const safeDuration = Math.max(0, duration);
    globalFadeInDuration = safeDuration;
    io.to('approved').emit('SET_FADE_IN', { fadeInDuration: safeDuration });
}
function getCurrentHHMMSS() {
    const now = new Date();
    const hh = now.getHours().toString().padStart(2, '0');
    const mm = now.getMinutes().toString().padStart(2, '0');
    const ss = now.getSeconds().toString().padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
}
function getCurrentHHMM() {
    const now = new Date();
    const hh = now.getHours().toString().padStart(2, '0');
    const mm = now.getMinutes().toString().padStart(2, '0');
    return `${hh}:${mm}`;
}
function getDayOfWeek() {
    // 0=Sun, 1=Mon, ..., 6=Sat
    return new Date().getDay();
}
function isDayActive(daysOfWeek) {
    const day = getDayOfWeek();
    return daysOfWeek.split(',').map(Number).includes(day);
}
function isTimeInRange(startTime, endTime, currentTime) {
    return currentTime >= startTime && currentTime < endTime;
}
let cachedBells = [];
let cachedPeriods = [];
let cachedSchedules = [];
async function reloadScheduleCache() {
    try {
        const [bells, periods, schedules] = await Promise.all([
            prisma_1.prisma.bellConfig.findMany({
                where: { isActive: true },
                include: { audioFile: true, department: true },
            }),
            prisma_1.prisma.period.findMany({
                where: { isActive: true },
                include: { audioFile: true, department: true },
            }),
            prisma_1.prisma.schedule.findMany({
                where: { isActive: true },
                include: {
                    playlist: {
                        include: { items: { include: { audioFile: true }, orderBy: { order: 'asc' } } },
                    },
                },
            })
        ]);
        cachedBells = bells;
        cachedPeriods = periods;
        cachedSchedules = schedules;
        console.log('[Scheduler] Cache reloaded successfully.');
    }
    catch (err) {
        console.error('[Scheduler] Failed to reload cache:', err);
    }
}
function startScheduler(io) {
    console.log('[Scheduler] Started');
    setInterval(async () => {
        const nowSS = getCurrentHHMMSS();
        const nowMM = getCurrentHHMM();
        // --- BELL CHECK (fires once per second per bell) ---
        if (nowSS !== lastSecondCheck) {
            lastSecondCheck = nowSS;
            bellPlayedThisSecond.clear();
            try {
                const bells = cachedBells.filter(b => b.time === nowSS);
                for (const bell of bells) {
                    if (!isDayActive(bell.daysOfWeek))
                        continue;
                    const key = `bell-${bell.id}`;
                    if (bellPlayedThisSecond.has(key))
                        continue;
                    bellPlayedThisSecond.add(key);
                    console.log(`[Scheduler] Ringing bell: ${bell.name || 'Bells'} for ${bell.department?.name || 'Unknown'} at ${bell.time}`);
                    io.emit('PLAY_BELL', {
                        url: bell.audioFile.path,
                        name: bell.audioFile.name,
                        type: bell.department?.name || 'Bells',
                        soundCardId: bell.department?.soundCardId || 'default',
                        volume: bell.volume,
                        fadeInDuration: globalFadeInDuration,
                        targetTime: Date.now() + 2500
                    });
                }
            }
            catch (err) {
                console.error('[Scheduler] Bell check error:', err);
            }
            // --- PERIOD BELL CHECK (startTime = vào tiết, endTime = ra tiết) ---
            try {
                const periods = cachedPeriods.filter(p => p.startTime === nowSS || p.endTime === nowSS);
                const triggeredDepKeys = new Set();
                for (const period of periods) {
                    if (!isDayActive(period.daysOfWeek))
                        continue;
                    const isStart = period.startTime === nowSS;
                    const depId = period.departmentId || 0;
                    // Deduplicate by department + second: ring only 1 bell per department at the exact same second
                    const depSecondKey = `dep-${depId}-${nowSS}`;
                    if (triggeredDepKeys.has(depSecondKey)) {
                        console.log(`[Scheduler] Skipping duplicate bell for department ${period.department?.name || depId} at ${nowSS} (same second trigger)`);
                        continue;
                    }
                    triggeredDepKeys.add(depSecondKey);
                    const key = `period-${period.id}-${isStart ? 'in' : 'out'}`;
                    if (bellPlayedThisSecond.has(key))
                        continue;
                    bellPlayedThisSecond.add(key);
                    const label = isStart ? `Bắt đầu ${period.name}` : `Kết thúc ${period.name}`;
                    console.log(`[Scheduler] Time bell: ${label} | ${period.department?.name || ''} at ${nowSS}`);
                    io.emit('PLAY_BELL', {
                        url: period.audioFile.path,
                        name: period.audioFile.name,
                        type: `${period.department?.name || ''} — ${label}`,
                        soundCardId: period.department?.soundCardId || 'default',
                        volume: period.volume,
                        fadeInDuration: globalFadeInDuration,
                        targetTime: Date.now() + 2500
                    });
                }
            }
            catch (err) {
                console.error('[Scheduler] Period bell check error:', err);
            }
            // --- SCHEDULE CHECK ---
            if (currentPlaylistState.scheduleId === -1)
                return;
            try {
                const schedules = cachedSchedules;
                const activeSchedule = schedules.find((s) => isTimeInRange(s.startTime, s.endTime, nowMM) && isDayActive(s.daysOfWeek));
                if (activeSchedule) {
                    let tracks = activeSchedule.playlist.items.map((i) => ({
                        path: i.audioFile.path,
                        name: i.audioFile.name,
                    }));
                    tracks = shuffleArray(tracks);
                    if (tracks.length === 0)
                        return;
                    // New schedule started
                    if (currentPlaylistState.scheduleId !== activeSchedule.id) {
                        currentPlaylistState = {
                            scheduleId: activeSchedule.id,
                            playlistId: activeSchedule.playlistId,
                            playlistVolume: activeSchedule.playlist.volume,
                            trackIndex: 0,
                            tracks,
                            status: 'playing',
                            targetTime: Date.now() + 2500,
                            pauseOffset: 0
                        };
                        playCurrentTrack(io);
                    }
                }
                else {
                    // No active schedule
                    if (currentPlaylistState.scheduleId !== null && currentPlaylistState.scheduleId !== -1) {
                        console.log('[Scheduler] No active schedule, stopping');
                        stopPlayback(io);
                    }
                }
            }
            catch (err) {
                console.error('[Scheduler] Schedule check error:', err);
            }
        }
    }, 1000); // Check every second
}
function playCurrentTrack(io) {
    if (currentPlaylistState.tracks.length === 0)
        return;
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
        fadeInDuration: globalFadeInDuration,
        isOverride: currentPlaylistState.playlistVolume !== null,
        targetTime: currentPlaylistState.targetTime
    });
    broadcastState(io);
}
let lastTrackEndedTime = 0;
function handleTrackEnded(io) {
    const now = Date.now();
    if (now - lastTrackEndedTime < 1000)
        return;
    lastTrackEndedTime = now;
    if (currentPlaylistState.tracks.length === 0)
        return;
    // Nếu là file đơn lẻ hoặc hàng đợi thủ công đã phát đến bài cuối -> dừng
    if (currentPlaylistState.scheduleId === -1 && currentPlaylistState.trackIndex === currentPlaylistState.tracks.length - 1) {
        stopPlayback(io);
        return;
    }
    // Nhảy bài tiếp theo (lịch trình sẽ lặp lại vô hạn cho đến khi hết giờ)
    currentPlaylistState.trackIndex = (currentPlaylistState.trackIndex + 1) % currentPlaylistState.tracks.length;
    playCurrentTrack(io);
}
// Manually trigger next track (called from admin)
function playNextTrack(io) {
    if (currentPlaylistState.tracks.length === 0)
        return;
    currentPlaylistState.trackIndex = (currentPlaylistState.trackIndex + 1) % currentPlaylistState.tracks.length;
    playCurrentTrack(io);
}
function playPrevTrack(io) {
    if (currentPlaylistState.tracks.length === 0)
        return;
    currentPlaylistState.trackIndex = (currentPlaylistState.trackIndex - 1 + currentPlaylistState.tracks.length) % currentPlaylistState.tracks.length;
    playCurrentTrack(io);
}
function pausePlayback(io) {
    if (currentPlaylistState.status !== 'playing' || !currentPlaylistState.targetTime)
        return;
    const exactNow = Date.now();
    // Nếu chưa kịp chạy (delay 2500ms) thì coi như pause ở giây 0
    currentPlaylistState.pauseOffset = Math.max(0, (exactNow - currentPlaylistState.targetTime) / 1000);
    currentPlaylistState.status = 'paused';
    io.emit('PAUSE_AUDIO');
    broadcastState(io);
}
function resumePlayback(io) {
    if (currentPlaylistState.status !== 'paused' || currentPlaylistState.pauseOffset === null)
        return;
    currentPlaylistState.status = 'playing';
    currentPlaylistState.targetTime = Date.now() + 2500 - currentPlaylistState.pauseOffset * 1000;
    broadcastState(io);
}
function seekPlayback(io, timeSeconds) {
    if (currentPlaylistState.tracks.length === 0)
        return;
    if (currentPlaylistState.status === 'paused') {
        currentPlaylistState.pauseOffset = timeSeconds;
        broadcastState(io);
    }
    else if (currentPlaylistState.status === 'playing') {
        currentPlaylistState.targetTime = Date.now() + 2500 - timeSeconds * 1000;
        const track = currentPlaylistState.tracks[currentPlaylistState.trackIndex];
        io.to('approved').emit('SYNC_STATE', {
            currentTrack: track,
            volume: currentPlaylistState.playlistVolume ?? globalVolume,
            isOverride: currentPlaylistState.playlistVolume !== null,
            targetTime: currentPlaylistState.targetTime
        });
        broadcastState(io);
    }
}
function stopPlayback(io) {
    io.emit('STOP_AUDIO', {});
    currentPlaylistState = { scheduleId: null, playlistId: null, playlistVolume: null, trackIndex: 0, tracks: [], status: 'stopped', targetTime: null, pauseOffset: null };
    broadcastState(io);
}
async function playManualFile(io, fileId) {
    const file = await prisma_1.prisma.audioFile.findUnique({ where: { id: fileId } });
    if (!file)
        throw new Error('File not found');
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
async function queueManualFile(io, fileId) {
    const file = await prisma_1.prisma.audioFile.findUnique({ where: { id: fileId } });
    if (!file)
        throw new Error('File not found');
    if (currentPlaylistState.status === 'stopped' || currentPlaylistState.scheduleId !== -1) {
        await playManualFile(io, fileId);
    }
    else {
        currentPlaylistState.tracks.push({ path: file.path, name: file.name });
        broadcastState(io);
    }
}
async function playManualPlaylist(io, playlistId) {
    const playlist = await prisma_1.prisma.playlist.findUnique({
        where: { id: playlistId },
        include: { items: { include: { audioFile: true }, orderBy: { order: 'asc' } } },
    });
    if (!playlist)
        throw new Error('Playlist not found');
    let tracks = playlist.items.map(i => ({
        path: i.audioFile.path,
        name: i.audioFile.name,
    }));
    tracks = shuffleArray(tracks);
    if (tracks.length === 0)
        throw new Error('Playlist is empty');
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
    playCurrentTrack(io);
}
async function queueManualPlaylist(io, playlistId) {
    const playlist = await prisma_1.prisma.playlist.findUnique({
        where: { id: playlistId },
        include: { items: { include: { audioFile: true }, orderBy: { order: 'asc' } } },
    });
    if (!playlist)
        throw new Error('Playlist not found');
    let tracks = playlist.items.map(i => ({
        path: i.audioFile.path,
        name: i.audioFile.name,
    }));
    tracks = shuffleArray(tracks);
    if (tracks.length === 0)
        throw new Error('Playlist is empty');
    if (currentPlaylistState.status === 'stopped' || currentPlaylistState.scheduleId !== -1) {
        await playManualPlaylist(io, playlistId);
    }
    else {
        currentPlaylistState.tracks.push(...tracks);
        broadcastState(io);
    }
}
function getCurrentState() {
    return { ...currentPlaylistState, volume: globalVolume, fadeInDuration: globalFadeInDuration };
}
function broadcastState(io) {
    const state = getCurrentState();
    if (state.tracks.length > 0) {
        const idx = Math.min(state.trackIndex, state.tracks.length - 1);
        io.to('approved').emit('SYNC_STATE', {
            currentTrack: state.tracks[idx],
            volume: state.playlistVolume ?? state.volume,
            fadeInDuration: globalFadeInDuration,
            isOverride: state.playlistVolume !== null,
            targetTime: state.targetTime,
            status: state.status,
            pauseOffset: state.pauseOffset,
            upNext: state.tracks.slice(idx + 1)
        });
    }
    else {
        io.to('approved').emit('SYNC_STATE', { currentTrack: null, status: 'stopped', upNext: [] });
    }
}
