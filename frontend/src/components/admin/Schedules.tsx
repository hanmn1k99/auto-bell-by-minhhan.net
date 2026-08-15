import type { Schedule } from '../../AdminPage';

import React, { useContext, useState, useEffect, useRef } from 'react';
import { AdminContext } from './AdminContext';

export const Schedules = () => {
  const ctx = useContext(AdminContext);
  // We will manually fix the destructuring later, or use ctx.foo in the code.
  // Actually, replacing all undefined variables with ctx.varName is hard.
  // Instead, we will destructure everything we can think of.
  const { tab, setTab, files, setFiles, schedules, setSchedules, bells, setBells, departments, setDepartments, periods, setPeriods, devices, setDevices, usersList, setUsersList, msg, setMsg, logoUrl, setLogoUrl, faviconUrl, setFaviconUrl, volume, setVolume, globalFadeInDuration, setGlobalFadeInDuration, orgMode, setOrgMode, fileUploading, setFileUploading, uploadProgress, setUploadProgress, selectedFileIds, setSelectedFileIds, addFileId, setAddFileId, newSchName, setNewSchName, selectedSch, setSelectedSch, pForm, setPForm, editingPeriod, setEditingPeriod, selectedPeriods, setSelectedPeriods, showBulkEditPeriod, setShowBulkEditPeriod, bulkEditPeriodForm, setBulkEditPeriodForm, bulkDep, setBulkDep, bulkAudio, setBulkAudio, bulkCount, setBulkCount, bulkStart, setBulkStart, bulkDuration, setBulkDuration, bulkBreak, setBulkBreak, bulkLongBreaks, setBulkLongBreaks, bulkDays, setBulkDays, bulkBaseName, setBulkBaseName, bulkPreview, setBulkPreview, depName, setDepName, depColor, setDepColor, depSoundCardId, setDepSoundCardId, depEditId, setDepEditId, availableSoundCards, setAvailableSoundCards, isSimulatorMode, setIsSimulatorMode, ytUrl, setYtUrl, ytPlayingVideo, setYtPlayingVideo, ytPlayingTitle, setYtPlayingTitle, ytCCOn, setYtCCOn, ytVideoPaused, setYtVideoPaused, ytSearchResults, setYtSearchResults, ytSearching, setYtSearching, inlinePreviewId, setInlinePreviewId, dialog, setDialog, playingPreviewSrc, setPlayingPreviewSrc, nowPlaying, setNowPlaying, bellPlaying, setBellPlaying, sidebarOpen, setSidebarOpen, mediaDuration, setMediaDuration, api, notify, userRole, curProfile, DAYS, ALL_WEEKDAYS, ALL_DAYS, systemMenuOpen, setSystemMenuOpen, systemHovered, setSystemHovered, showUserForm, setShowUserForm, newUser, setNewUser, systemSubTab, setSystemSubTab, playlists, playManual, queueManual, fetchDepartments, customConfirm, getSoundCardName, triggerLiveTestBell, PREDEFINED_COLORS, guessIcon, getSoundCardIcon, customPrompt, updateDevice, deleteDevice, fetchDevices, fetchFiles, API_URL, MiniPlayer, fetchPeriods, DayPicker, MiniPlayerProgress, handleVolumeChange, handleFadeInChange, fetchSchedules, ORG_PROFILES, changeOrgMode, fetchUsers, resumeYtVideoOnPlayer, pauseYtVideoOnPlayer, stopYtVideoOnPlayer, handleYtInputKeyDown, fastPlayYt } = ctx;

  
    const createSch = async () => {
      if (!newSchName.trim()) return;
      try {
        await api.post('/api/schedules', { name: newSchName, startTime: '07:00', endTime: '08:00', daysOfWeek: ALL_WEEKDAYS, isActive: true });
        setNewSchName(''); fetchSchedules(); notify('Đã tạo lịch mới!');
      } catch { notify('Lỗi tạo lịch', 'err'); }
    };

    const deleteSchedule = async (id: number) => {
      if (!(await customConfirm('Xóa lịch này? Toàn bộ danh sách bài hát đi kèm sẽ bị xóa.'))) return;
      try { await api.delete(`/api/schedules/${id}`); if (selectedSch?.id === id) setSelectedSch(null); fetchSchedules(); notify('Đã xóa'); }
      catch { notify('Lỗi xóa', 'err'); }
    };

    const toggleActive = async (s: Schedule) => {
      try { await api.put(`/api/schedules/${s.id}`, { ...s, isActive: !s.isActive }); fetchSchedules(); }
      catch {}
    };

    const saveDetails = async (s: Schedule, updates: any) => {
      try {
        await api.put(`/api/schedules/${s.id}`, { ...s, ...updates });
        if (selectedSch && selectedSch.id === s.id) {
          setSelectedSch(prev => prev ? { ...prev, ...updates } : null);
        }
        fetchSchedules();
      } catch { notify('Lỗi lưu', 'err'); }
    };

    const saveVolume = async (s: Schedule, newVol: number) => {
      if (!s.playlist) return;
      try {
        await api.put(`/api/playlists/${s.playlist.id}`, { name: s.playlist.name, volume: newVol });
        if (selectedSch && selectedSch.id === s.id) {
          setSelectedSch(prev => prev && prev.playlist ? { ...prev, playlist: { ...prev.playlist, volume: newVol } } : null);
        }
        fetchSchedules();
      } catch {}
    };

    const saveLoop = async (s: Schedule, isLoop: boolean) => {
      if (!s.playlist) return;
      try {
        await api.put(`/api/playlists/${s.playlist.id}`, { name: s.playlist.name, isLoop });
        if (selectedSch && selectedSch.id === s.id) {
          setSelectedSch(prev => prev && prev.playlist ? { ...prev, playlist: { ...prev.playlist, isLoop } } : null);
        }
        fetchSchedules();
      } catch { notify('Lỗi lưu cấu hình lặp', 'err'); }
    };

    const addSong = async (s: Schedule) => {
      if (!addFileId || !s.playlist) return;
      try {
        await api.post(`/api/playlists/${s.playlist.id}/items`, { audioFileId: Number(addFileId) });
        setAddFileId(''); fetchSchedules(); notify('Đã thêm bài!');
      } catch { notify('Lỗi thêm bài', 'err'); }
    };

        const removeSong = async (s: Schedule, itemId: number) => {
      if (!s.playlist) return;
      try { 
        if (selectedSch?.id === s.id && selectedSch.playlist) {
           const updatedItems = selectedSch.playlist.items.filter(i => i.id !== itemId);
           setSelectedSch({ ...selectedSch, playlist: { ...selectedSch.playlist, items: updatedItems } });
        }
        await api.delete(`/api/playlists/${s.playlist.id}/items/${itemId}`); 
        fetchSchedules(); 
        notify('Đã xóa bài!');
      } catch { 
        notify('Lỗi xóa bài', 'err'); 
        fetchSchedules();
      }
    };

    // Helper: auto-update selectedSch if schedules list updates
// HOISTED
// HOISTED
// HOISTED
// HOISTED
// HOISTED
// HOISTED

    return (
      <div className="admin-section">
        <h2>Quản lý Lịch Phát Nhạc</h2>
        <div className="two-col">
          <div className="col-left">
            <div className="card mb-3">
              <h3>Tạo lịch mới</h3>
              <div className="input-row">
                <input className="input" value={newSchName} onChange={e => setNewSchName(e.target.value)} placeholder="Tên lịch (VD: Giờ ra chơi)" onKeyDown={e => e.key === 'Enter' && createSch()} />
                <button className="btn btn-primary btn-sm" onClick={createSch}>{React.createElement('ion-icon', { name: 'add-outline' })} Tạo</button>
              </div>
            </div>
            <div className="card">
              <h3>Danh sách lịch ({schedules.length})</h3>
              {schedules.length === 0 && <div className="empty-state">Chưa có lịch nào</div>}
              {schedules.map(s => (
                <div key={s.id} className={`playlist-item ${selectedSch?.id === s.id ? 'active' : ''} ${!s.isActive ? 'inactive' : ''}`} onClick={() => setSelectedSch(s)}>
                  <div style={{ flex: 1 }}>
                    <div className="playlist-name">{s.name}</div>
                    <div className="playlist-meta" style={{ marginTop: '4px' }}>
                      <span className="time-badge">{s.startTime} - {s.endTime}</span>
                      <span style={{ marginLeft: '8px' }}>{s.playlist?.items?.length ?? 0} bài • {s.daysOfWeek.split(',').map(d => DAYS[Number(d)]).join(' ')}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <button 
                      className="btn btn-sm"
                      style={{ 
                        ...( s.isActive ? { backgroundColor: 'var(--success)', color: '#fff', borderColor: 'var(--success)' } : { backgroundColor: 'transparent', color: '#ef4444', borderColor: '#ef4444' } ),
                        minWidth: '68px',
                        justifyContent: 'center'
                      }}
                      onClick={e => { e.stopPropagation(); toggleActive(s); }}
                    >
                      {React.createElement('ion-icon', { name: s.isActive ? 'toggle' : 'toggle-outline' })} 
                      {s.isActive ? 'Bật' : 'Tắt'}
                    </button>
                    <button className="btn btn-icon btn-danger-ghost" onClick={e => { e.stopPropagation(); deleteSchedule(s.id); }}>
                      {React.createElement('ion-icon', { name: 'trash-outline' })}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="col-right">
            {selectedSch ? (() => {
              const s = selectedSch;
              return (
                <div className="card">
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                    {React.createElement('ion-icon', { name: 'calendar-outline' })} Cài đặt lịch: {s.name}
                  </h3>
                  
                  {/* Cài đặt thời gian */}
                  <div className="form-group mb-3">
                    <label>Tên lịch phát</label>
                    <input key={`name-${s.id}`} className="input" defaultValue={s.name} onBlur={e => saveDetails(s, { name: e.target.value })} />
                  </div>
                  <div className="form-row mb-3">
                    <div className="form-group">
                      <label>Từ giờ</label>
                      <input key={`start-${s.id}`} type="time" className="input" defaultValue={s.startTime} onBlur={e => saveDetails(s, { startTime: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Đến giờ</label>
                      <input key={`end-${s.id}`} type="time" className="input" defaultValue={s.endTime} onBlur={e => saveDetails(s, { endTime: e.target.value })} />
                    </div>
                  </div>
                  <div className="form-row mb-4">
                    <div className="form-group" style={{ flex: 2, opacity: ((s.playlist as any)?.isLoop ?? true) ? 1 : 0.4, pointerEvents: ((s.playlist as any)?.isLoop ?? true) ? 'auto' : 'none', transition: 'all 0.2s' }}>
                      <label>Ngày phát trong tuần</label>
                      <DayPicker value={s.daysOfWeek} onChange={v => saveDetails(s, { daysOfWeek: v })} />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>Lặp lại</label>
                      <div className="day-picker">
                        <button 
                          className={`day-btn ${(s.playlist as any)?.isLoop ?? true ? 'active' : ''}`} 
                          onClick={() => saveLoop(s, !((s.playlist as any)?.isLoop ?? true))}
                          title="Lặp lại danh sách"
                        >
                          {React.createElement('ion-icon', { name: 'repeat-outline', style: { fontSize: '1.2rem' } })}
                        </button>
                      </div>
                    </div>
                  </div>

                  <hr style={{ borderColor: 'var(--border)', margin: '1.5rem 0' }} />

                  {/* Cài đặt danh sách bài hát */}
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                    {React.createElement('ion-icon', { name: 'musical-notes-outline' })} Danh sách bài hát của lịch này
                  </h3>
                  <div className="input-row mb-3" style={{ alignItems: 'center', gap: '1rem' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Âm lượng:</span>
                    <input 
                      type="range" min="0" max="1" step="0.05" 
                      value={s.playlist?.volume ?? 1.0} 
                      onChange={e => saveVolume(s, Number(e.target.value))} 
                      style={{ flex: 1 }} 
                    />
                    <span style={{ width: '40px', fontSize: '0.85rem' }}>{Math.round((s.playlist?.volume ?? 1.0) * 100)}%</span>
                  </div>

                  <div className="input-row mb-3">
                    <select className="input" value={addFileId} onChange={e => setAddFileId(e.target.value)}>
                      <option value="">Chọn bài để thêm...</option>
                      {files.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                    <button className="btn btn-primary btn-sm" onClick={() => addSong(s)}>{React.createElement('ion-icon', { name: 'add-outline' })} Thêm</button>
                  </div>
                  
                  {s.playlist?.items?.length === 0 && <div className="empty-state">Chưa có bài nào</div>}
                  {s.playlist?.items?.map((item, i) => (
                    <div key={item.id} className="pl-item-row">
                      <span className="pl-item-num">{i + 1}</span>
                      <span className="pl-item-name">{item.audioFile.name}</span>
                      <button className="btn btn-icon btn-danger-ghost" onClick={() => removeSong(s, item.id)}>{React.createElement('ion-icon', { name: 'close-outline' })}</button>
                    </div>
                  ))}
                </div>
              );
            })() : (
              <div className="card center-content"><div className="empty-state">← Chọn một lịch phát ở bên trái để chỉnh sửa</div></div>
            )}
          </div>
        </div>
      </div>
    );
  };

  