
import React, { useContext, useState, useEffect, useRef } from 'react';
import { AdminContext } from './AdminContext';

export const RightSidebar = () => {
  const ctx = useContext(AdminContext);
  // We will manually fix the destructuring later, or use ctx.foo in the code.
  // Actually, replacing all undefined variables with ctx.varName is hard.
  // Instead, we will destructure everything we can think of.
  const { tab, setTab, files, setFiles, schedules, setSchedules, bells, setBells, departments, setDepartments, periods, setPeriods, devices, setDevices, usersList, setUsersList, msg, setMsg, logoUrl, setLogoUrl, faviconUrl, setFaviconUrl, volume, setVolume, globalFadeInDuration, setGlobalFadeInDuration, orgMode, setOrgMode, fileUploading, setFileUploading, uploadProgress, setUploadProgress, selectedFileIds, setSelectedFileIds, addFileId, setAddFileId, newSchName, setNewSchName, selectedSch, setSelectedSch, pForm, setPForm, editingPeriod, setEditingPeriod, selectedPeriods, setSelectedPeriods, showBulkEditPeriod, setShowBulkEditPeriod, bulkEditPeriodForm, setBulkEditPeriodForm, bulkDep, setBulkDep, bulkAudio, setBulkAudio, bulkCount, setBulkCount, bulkStart, setBulkStart, bulkDuration, setBulkDuration, bulkBreak, setBulkBreak, bulkLongBreaks, setBulkLongBreaks, bulkDays, setBulkDays, bulkBaseName, setBulkBaseName, bulkPreview, setBulkPreview, depName, setDepName, depColor, setDepColor, depSoundCardId, setDepSoundCardId, depEditId, setDepEditId, availableSoundCards, setAvailableSoundCards, isSimulatorMode, setIsSimulatorMode, ytUrl, setYtUrl, ytPlayingVideo, setYtPlayingVideo, ytPlayingTitle, setYtPlayingTitle, ytCCOn, setYtCCOn, ytVideoPaused, setYtVideoPaused, ytSearchResults, setYtSearchResults, ytSearching, setYtSearching, inlinePreviewId, setInlinePreviewId, dialog, setDialog, playingPreviewSrc, setPlayingPreviewSrc, nowPlaying, setNowPlaying, bellPlaying, setBellPlaying, sidebarOpen, setSidebarOpen, mediaDuration, setMediaDuration, api, notify, userRole, curProfile, DAYS, ALL_WEEKDAYS, ALL_DAYS, systemMenuOpen, setSystemMenuOpen, systemHovered, setSystemHovered, showUserForm, setShowUserForm, newUser, setNewUser, systemSubTab, setSystemSubTab, playlists, playManual, queueManual, fetchDepartments, customConfirm, getSoundCardName, triggerLiveTestBell, PREDEFINED_COLORS, guessIcon, getSoundCardIcon, customPrompt, updateDevice, deleteDevice, fetchDevices, fetchFiles, API_URL, MiniPlayer, fetchPeriods, DayPicker, MiniPlayerProgress, handleVolumeChange, handleFadeInChange, fetchSchedules, ORG_PROFILES, changeOrgMode, fetchUsers, resumeYtVideoOnPlayer, pauseYtVideoOnPlayer, stopYtVideoOnPlayer, handleYtInputKeyDown, fastPlayYt } = ctx;

  return (
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
          <div className="media-title" title={String(nowPlaying?.name ?? '')}>{nowPlaying ? String(nowPlaying.name ?? '') : 'Chưa có bài hát nào'}</div>
          {nowPlaying?.isOverride && <div className="media-override">* Đang ghi đè âm lượng</div>}
        </div>
        
        <MiniPlayerProgress nowPlaying={nowPlaying} mediaDuration={mediaDuration} api={api} />

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
                <span className="name" title={String(track.name ?? '')}>{String(track.name ?? '')}</span>
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
};
  