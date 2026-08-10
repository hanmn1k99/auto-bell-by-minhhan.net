
import React, { useContext, useState, useEffect, useRef } from 'react';
import { AdminContext } from './AdminContext';

export const Departments = () => {
  const ctx = useContext(AdminContext);
  // We will manually fix the destructuring later, or use ctx.foo in the code.
  // Actually, replacing all undefined variables with ctx.varName is hard.
  // Instead, we will destructure everything we can think of.
  const { tab, setTab, files, setFiles, schedules, setSchedules, bells, setBells, departments, setDepartments, periods, setPeriods, devices, setDevices, usersList, setUsersList, msg, setMsg, logoUrl, setLogoUrl, faviconUrl, setFaviconUrl, volume, setVolume, globalFadeInDuration, setGlobalFadeInDuration, orgMode, setOrgMode, fileUploading, setFileUploading, uploadProgress, setUploadProgress, selectedFileIds, setSelectedFileIds, addFileId, setAddFileId, newSchName, setNewSchName, selectedSch, setSelectedSch, pForm, setPForm, editingPeriod, setEditingPeriod, selectedPeriods, setSelectedPeriods, showBulkEditPeriod, setShowBulkEditPeriod, bulkEditPeriodForm, setBulkEditPeriodForm, bulkDep, setBulkDep, bulkAudio, setBulkAudio, bulkCount, setBulkCount, bulkStart, setBulkStart, bulkDuration, setBulkDuration, bulkBreak, setBulkBreak, bulkLongBreaks, setBulkLongBreaks, bulkDays, setBulkDays, bulkBaseName, setBulkBaseName, bulkPreview, setBulkPreview, depName, setDepName, depColor, setDepColor, depSoundCardId, setDepSoundCardId, depEditId, setDepEditId, availableSoundCards, setAvailableSoundCards, isSimulatorMode, setIsSimulatorMode, ytUrl, setYtUrl, ytPlayingVideo, setYtPlayingVideo, ytPlayingTitle, setYtPlayingTitle, ytCCOn, setYtCCOn, ytVideoPaused, setYtVideoPaused, ytSearchResults, setYtSearchResults, ytSearching, setYtSearching, inlinePreviewId, setInlinePreviewId, dialog, setDialog, playingPreviewSrc, setPlayingPreviewSrc, nowPlaying, setNowPlaying, bellPlaying, setBellPlaying, sidebarOpen, setSidebarOpen, mediaDuration, setMediaDuration, api, notify, userRole, curProfile, DAYS, ALL_WEEKDAYS, ALL_DAYS, systemMenuOpen, setSystemMenuOpen, systemHovered, setSystemHovered, showUserForm, setShowUserForm, newUser, setNewUser, systemSubTab, setSystemSubTab, playlists, playManual, queueManual, fetchDepartments, customConfirm, getSoundCardName, triggerLiveTestBell, PREDEFINED_COLORS, guessIcon, getSoundCardIcon, customPrompt, updateDevice, deleteDevice, fetchDevices, fetchFiles, API_URL, MiniPlayer, fetchPeriods, DayPicker, MiniPlayerProgress, handleVolumeChange, handleFadeInChange, fetchSchedules, ORG_PROFILES, changeOrgMode, fetchUsers, resumeYtVideoOnPlayer, pauseYtVideoOnPlayer, stopYtVideoOnPlayer, handleYtInputKeyDown, fastPlayYt } = ctx;

  

    const save = async () => {
      if (!depName) return notify('Tên không được để trống', 'err');
      try {
        if (depEditId) {
          await api.put(`/api/departments/${depEditId}`, { name: depName, color: depColor, soundCardId: depSoundCardId });
        } else {
          await api.post('/api/departments', { name: depName, color: depColor, soundCardId: depSoundCardId });
        }
        setDepName(''); setDepColor('#863bff'); setDepSoundCardId('default'); setDepEditId(null);
        fetchDepartments();
        notify('Đã lưu khu vực');
      } catch {
        notify('Lỗi lưu khu vực', 'err');
      }
    };

    const remove = async (id: number) => {
      if (!(await customConfirm('Xóa khu vực này?'))) return;
      try {
        await api.delete(`/api/departments/${id}`);
        fetchDepartments();
      } catch {
        notify('Lỗi xóa (Có thể đang có chuông gắn với khu vực này)', 'err');
      }
    };

    const getSoundCardLabel = (scId?: string) => {
      return getSoundCardName(scId || 'default');
    };

    return (
      <div className="admin-section">
        <h2>Phân loại / Khu vực</h2>

        <div className="card" style={{ maxWidth: '650px', marginBottom: '2rem' }}>
          <h3>Thêm khu vực mới</h3>
          <div className="form-group">
            <label>Tên phân loại (Vd: {curProfile.departmentLabel} A)</label>
            <input type="text" className="input" value={depEditId ? '' : depName} onChange={e => setDepName(e.target.value)} placeholder={`Nhập tên ${curProfile.departmentLabel}`} />
          </div>

          <div className="form-group">
            <label>Thiết bị Âm thanh Phụ trách</label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <select className="input" value={depSoundCardId} onChange={e => setDepSoundCardId(e.target.value)} style={{ flex: 1 }}>
                <option value="default">Mặc định hệ thống</option>
                <option value="all">Tất cả kênh (Phát toàn bộ)</option>
                <option value="card-1">Kênh 1</option>
                <option value="card-2">Kênh 2</option>
                {availableSoundCards.map(device => (
                  <optgroup key={device.deviceId} label={`Player: ${device.deviceName}`}>
                    {device.cards.map(card => (
                      <option key={`${device.deviceId}::${card.deviceId}`} value={`${device.deviceId}::${card.deviceId}`}>
                        {device.deviceName} - {card.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <button 
                type="button" 
                className="btn btn-outline" 
                onClick={() => triggerLiveTestBell(depSoundCardId)}
                title="Phát thử âm thanh qua thiết bị đang chọn"
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', whiteSpace: 'nowrap', padding: '0.65rem 0.9rem', fontSize: '0.85rem' }}
              >
                {React.createElement('ion-icon', { name: 'volume-high-outline' })} Âm thử
              </button>
            </div>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h3 style={{ margin: 0 }}>Danh sách phân loại ({departments.length})</h3>
            <button 
              type="button" 
              className="btn btn-xs btn-outline" 
              onClick={() => triggerLiveTestBell('all')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', borderColor: '#f59e0b', color: '#fbbf24', fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
              title="Phát chuông thử nghiệm đồng thời ra tất cả các kênh"
            >
              {React.createElement('ion-icon', { name: 'mega-phone-outline' })} Phát thử tất cả
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {departments.map(d => (
              <div key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', border: '1px solid var(--border)', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', overflow: 'hidden' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: d.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1.3rem', flexShrink: 0, boxShadow: '0 4px 6px rgba(0,0,0,0.15)' }}>
                    {React.createElement('ion-icon', { name: guessIcon(d.name) })}
                  </div>

                  <div>
                    <strong style={{ fontSize: '1.05rem', color: '#fff' }}>{d.name}</strong>
                    <div style={{ fontSize: '0.8rem', color: '#60a5fa', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 500 }}>
                      {React.createElement('ion-icon', { name: getSoundCardIcon(d.soundCardId), style: { fontSize: '0.95rem' } })}
                      <span>{getSoundCardLabel(d.soundCardId)}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button 
                    type="button"
                    className="btn btn-xs btn-outline" 
                    onClick={() => triggerLiveTestBell(d.soundCardId || 'default')}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.35rem 0.75rem', fontSize: '0.8rem', borderColor: 'var(--accent)', color: 'var(--accent)' }}
                    title={`Phát chuông thử nghiệm qua ${getSoundCardLabel(d.soundCardId)}`}
                  >
                    {React.createElement('ion-icon', { name: 'volume-high-outline' })} Âm thử
                  </button>

                  <button className="btn btn-icon btn-xs" onClick={() => { setDepEditId(d.id); setDepName(d.name); setDepColor(d.color || '#863bff'); setDepSoundCardId(d.soundCardId || 'default'); }} title="Chỉnh sửa">
                    {React.createElement('ion-icon', { name: 'pencil-outline' })}
                  </button>

                  <button className="btn btn-icon btn-danger-ghost btn-xs" onClick={() => remove(d.id)} title="Xóa">
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
            <div className="modal-content" style={{ maxWidth: '480px', width: '100%' }}>
              <h3 style={{ marginTop: 0, marginBottom: '1.25rem' }}>Sửa khu vực</h3>
              <div className="form-group">
                <label>Tên phân loại</label>
                <input type="text" className="input" value={depName} onChange={e => setDepName(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Thiết bị Âm thanh Phụ trách</label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <select className="input" value={depSoundCardId} onChange={e => setDepSoundCardId(e.target.value)} style={{ flex: 1 }}>
                    <option value="default">Mặc định hệ thống</option>
                    <option value="all">Tất cả kênh (Phát toàn bộ)</option>
                    <option value="card-1">Kênh 1</option>
                    <option value="card-2">Kênh 2</option>

                  </select>
                  <button 
                    type="button" 
                    className="btn btn-outline" 
                    onClick={() => triggerLiveTestBell(depSoundCardId)}
                    title="Phát thử âm thanh qua Card đang chọn"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', whiteSpace: 'nowrap', padding: '0.65rem 0.9rem', fontSize: '0.85rem' }}
                  >
                    {React.createElement('ion-icon', { name: 'volume-high-outline' })} Âm thử
                  </button>
                </div>
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
                <button className="btn btn-ghost" onClick={() => { setDepEditId(null); setDepName(''); setDepColor('#863bff'); setDepSoundCardId('default'); }}>Hủy</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  