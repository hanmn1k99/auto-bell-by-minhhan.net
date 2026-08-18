
import React, { useContext, useState, useEffect, useRef } from 'react';
import { AdminContext } from './AdminContext';

export const Devices = () => {
  const ctx = useContext(AdminContext);
  // We will manually fix the destructuring later, or use ctx.foo in the code.
  // Actually, replacing all undefined variables with ctx.varName is hard.
  // Instead, we will destructure everything we can think of.
  const { tab, setTab, files, setFiles, schedules, setSchedules, bells, setBells, departments, setDepartments, periods, setPeriods, devices, setDevices, usersList, setUsersList, msg, setMsg, logoUrl, setLogoUrl, faviconUrl, setFaviconUrl, volume, setVolume, globalFadeInDuration, setGlobalFadeInDuration, orgMode, setOrgMode, fileUploading, setFileUploading, uploadProgress, setUploadProgress, selectedFileIds, setSelectedFileIds, addFileId, setAddFileId, newSchName, setNewSchName, selectedSch, setSelectedSch, pForm, setPForm, editingPeriod, setEditingPeriod, selectedPeriods, setSelectedPeriods, showBulkEditPeriod, setShowBulkEditPeriod, bulkEditPeriodForm, setBulkEditPeriodForm, bulkDep, setBulkDep, bulkAudio, setBulkAudio, bulkCount, setBulkCount, bulkStart, setBulkStart, bulkDuration, setBulkDuration, bulkBreak, setBulkBreak, bulkLongBreaks, setBulkLongBreaks, bulkDays, setBulkDays, bulkBaseName, setBulkBaseName, bulkPreview, setBulkPreview, depName, setDepName, depColor, setDepColor, depSoundCardId, setDepSoundCardId, depEditId, setDepEditId, availableSoundCards, setAvailableSoundCards, isSimulatorMode, setIsSimulatorMode, ytUrl, setYtUrl, ytPlayingVideo, setYtPlayingVideo, ytPlayingTitle, setYtPlayingTitle, ytCCOn, setYtCCOn, ytVideoPaused, setYtVideoPaused, ytSearchResults, setYtSearchResults, ytSearching, setYtSearching, inlinePreviewId, setInlinePreviewId, dialog, setDialog, playingPreviewSrc, setPlayingPreviewSrc, nowPlaying, setNowPlaying, bellPlaying, setBellPlaying, sidebarOpen, setSidebarOpen, mediaDuration, setMediaDuration, api, notify, userRole, curProfile, DAYS, ALL_WEEKDAYS, ALL_DAYS, systemMenuOpen, setSystemMenuOpen, systemHovered, setSystemHovered, showUserForm, setShowUserForm, newUser, setNewUser, systemSubTab, setSystemSubTab, playlists, playManual, queueManual, fetchDepartments, customConfirm, getSoundCardName, triggerLiveTestBell, PREDEFINED_COLORS, guessIcon, getSoundCardIcon, customPrompt, updateDevice, deleteDevice, fetchDevices, fetchFiles, API_URL, MiniPlayer, fetchPeriods, DayPicker, MiniPlayerProgress, handleVolumeChange, handleFadeInChange, fetchSchedules, ORG_PROFILES, changeOrgMode, fetchUsers, resumeYtVideoOnPlayer, pauseYtVideoOnPlayer, stopYtVideoOnPlayer, handleYtInputKeyDown, fastPlayYt } = ctx;

  
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
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: '0.2rem' }}>ID: {d.id.length > 12 ? `${d.id.substring(0,8)}********${d.id.substring(d.id.length - 4)}` : d.id}</div>
          </div>
          <div style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: d.isApproved ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', color: d.isApproved ? 'var(--success)' : 'var(--warning)', fontWeight: 500 }}>
            {d.isApproved ? 'Đã duyệt' : 'Chờ duyệt'}
          </div>
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.3rem', marginTop: '0.25rem' }}>
          <div><span style={{opacity: 0.6}}>IP:</span> <span style={{fontFamily: 'monospace'}}>{d.ipAddress || '-'}</span></div>
          {d.browserInfo && <div><span style={{opacity: 0.6}}>Trình duyệt:</span> {d.browserInfo}</div>}
          <div><span style={{opacity: 0.6}}>Hoạt động:</span> {formatDateTime(d.lastSeen)}</div>
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

  