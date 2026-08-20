
import React, { useContext, useState, useEffect, useRef } from 'react';
import { AdminContext } from './AdminContext';

export const Dashboard = () => {
  const ctx = useContext(AdminContext);
  // We will manually fix the destructuring later, or use ctx.foo in the code.
  // Actually, replacing all undefined variables with ctx.varName is hard.
  // Instead, we will destructure everything we can think of.
  const { tab, setTab, files, setFiles, schedules, setSchedules, bells, setBells, departments, setDepartments, periods, setPeriods, devices, setDevices, usersList, setUsersList, msg, setMsg, logoUrl, setLogoUrl, faviconUrl, setFaviconUrl, volume, setVolume, globalFadeInDuration, setGlobalFadeInDuration, orgMode, setOrgMode, fileUploading, setFileUploading, uploadProgress, setUploadProgress, selectedFileIds, setSelectedFileIds, addFileId, setAddFileId, newSchName, setNewSchName, selectedSch, setSelectedSch, pForm, setPForm, editingPeriod, setEditingPeriod, selectedPeriods, setSelectedPeriods, showBulkEditPeriod, setShowBulkEditPeriod, bulkEditPeriodForm, setBulkEditPeriodForm, bulkDep, setBulkDep, bulkAudio, setBulkAudio, bulkCount, setBulkCount, bulkStart, setBulkStart, bulkDuration, setBulkDuration, bulkBreak, setBulkBreak, bulkLongBreaks, setBulkLongBreaks, bulkDays, setBulkDays, bulkBaseName, setBulkBaseName, bulkPreview, setBulkPreview, depName, setDepName, depColor, setDepColor, depSoundCardId, setDepSoundCardId, depEditId, setDepEditId, availableSoundCards, setAvailableSoundCards, isSimulatorMode, setIsSimulatorMode, ytUrl, setYtUrl, ytPlayingVideo, setYtPlayingVideo, ytPlayingTitle, setYtPlayingTitle, ytCCOn, setYtCCOn, ytVideoPaused, setYtVideoPaused, ytSearchResults, setYtSearchResults, ytSearching, setYtSearching, inlinePreviewId, setInlinePreviewId, dialog, setDialog, playingPreviewSrc, setPlayingPreviewSrc, nowPlaying, setNowPlaying, bellPlaying, setBellPlaying, sidebarOpen, setSidebarOpen, mediaDuration, setMediaDuration, api, notify, userRole, curProfile, DAYS, ALL_WEEKDAYS, ALL_DAYS, systemMenuOpen, setSystemMenuOpen, systemHovered, setSystemHovered, showUserForm, setShowUserForm, newUser, setNewUser, systemSubTab, setSystemSubTab, playlists, setPlaylists, playManual, queueManual, fetchDepartments, customConfirm, getSoundCardName, triggerLiveTestBell, PREDEFINED_COLORS, guessIcon, getSoundCardIcon, customPrompt, updateDevice, deleteDevice, fetchDevices, fetchFiles, API_URL, MiniPlayer, fetchPeriods, DayPicker, MiniPlayerProgress, handleVolumeChange, handleFadeInChange, fetchSchedules, ORG_PROFILES, changeOrgMode, fetchUsers, resumeYtVideoOnPlayer, pauseYtVideoOnPlayer, stopYtVideoOnPlayer, handleYtInputKeyDown, fastPlayYt } = ctx;

  const movePlaylist = async (index: number, direction: -1 | 1) => {
    if (index + direction < 0 || index + direction >= playlists.length) return;
    const newPlaylists = [...playlists];
    const temp = newPlaylists[index];
    newPlaylists[index] = newPlaylists[index + direction];
    newPlaylists[index + direction] = temp;
    setPlaylists(newPlaylists);

    try {
      const orderIds = newPlaylists.map(p => p.id);
      await api.post('/api/playlists/reorder', { orderIds });
    } catch (err) {
      notify('Lỗi khi lưu vị trí', 'error');
    }
  };

  return (
    <div className="admin-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0 }}>Bảng điều khiển</h2>
      </div>

      {bellPlaying && (
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--accent)', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem', animation: 'pulse 2s infinite' }}>
          <div style={{ fontSize: '2.5rem', color: 'var(--accent)' }}>{React.createElement('ion-icon', { name: 'notifications' })}</div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--accent)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>
              Đang đổ chuông trực tiếp
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#f8fafc', marginTop: '0.25rem' }}>
              [Chuông] {String(bellPlaying.name ?? '')}
            </div>
          </div>
        </div>
      )}

      <div className="dashboard-grid">
        <div className="dashboard-main">
          <div className="stat-grid">
            <div className="stat-card"><div className="stat-num">{files.length}</div><div className="stat-label">Bài Hát</div></div>
            <div className="stat-card"><div className="stat-num">{schedules.filter((s: any) => s.isActive).length}</div><div className="stat-label">Playlist Đang Bật</div></div>
            <div className="stat-card"><div className="stat-num">{periods.filter((p: any) => p.isActive).length}</div><div className="stat-label">{curProfile.itemName} Đang Bật</div></div>
          </div>

          <div className="dashboard-controls" style={{ marginTop: '2rem' }}>
            <h3>Phát Playlist</h3>
            {playlists.length === 0 && <div className="empty-state" style={{ padding: '1rem' }}>Chưa có playlist nào</div>}
            <div className="play-card-container">
              {playlists.map((p: any, index: number) => {
                const s = schedules.find((sch: any) => sch.playlistId === p.id);
                return (
                <div className="play-card" key={p.id}>
                  <div className="play-card-title" title={p.name}>{p.name}</div>
                  <div className="play-card-meta">{p.items?.length ?? 0} bài hát</div>
                  <div className="dashboard-card-actions">
                    <div style={{ display: 'flex', gap: '0.25rem', marginRight: '0.5rem' }}>
                      <button className="btn btn-outline btn-sm" style={{ padding: '0.25rem', minWidth: 'unset' }} onClick={() => movePlaylist(index, -1)} disabled={index === 0}>
                        {React.createElement('ion-icon', { name: 'arrow-up' })}
                      </button>
                      <button className="btn btn-outline btn-sm" style={{ padding: '0.25rem', minWidth: 'unset' }} onClick={() => movePlaylist(index, 1)} disabled={index === playlists.length - 1}>
                        {React.createElement('ion-icon', { name: 'arrow-down' })}
                      </button>
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={() => playManual('playlist', p.id)}>
                      {React.createElement('ion-icon', { name: 'play' })} Phát
                    </button>
                  </div>
                </div>
              )})}
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
};
  