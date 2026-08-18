
import React, { useContext, useState, useEffect, useRef } from 'react';
import { AdminContext } from './AdminContext';
import { formatDDMMYYYY } from '../../utils/date';

export const Users = () => {
  const ctx = useContext(AdminContext);
  // We will manually fix the destructuring later, or use ctx.foo in the code.
  // Actually, replacing all undefined variables with ctx.varName is hard.
  // Instead, we will destructure everything we can think of.
  const { tab, setTab, files, setFiles, schedules, setSchedules, bells, setBells, departments, setDepartments, periods, setPeriods, devices, setDevices, usersList, setUsersList, msg, setMsg, logoUrl, setLogoUrl, faviconUrl, setFaviconUrl, volume, setVolume, globalFadeInDuration, setGlobalFadeInDuration, orgMode, setOrgMode, fileUploading, setFileUploading, uploadProgress, setUploadProgress, selectedFileIds, setSelectedFileIds, addFileId, setAddFileId, newSchName, setNewSchName, selectedSch, setSelectedSch, pForm, setPForm, editingPeriod, setEditingPeriod, selectedPeriods, setSelectedPeriods, showBulkEditPeriod, setShowBulkEditPeriod, bulkEditPeriodForm, setBulkEditPeriodForm, bulkDep, setBulkDep, bulkAudio, setBulkAudio, bulkCount, setBulkCount, bulkStart, setBulkStart, bulkDuration, setBulkDuration, bulkBreak, setBulkBreak, bulkLongBreaks, setBulkLongBreaks, bulkDays, setBulkDays, bulkBaseName, setBulkBaseName, bulkPreview, setBulkPreview, depName, setDepName, depColor, setDepColor, depSoundCardId, setDepSoundCardId, depEditId, setDepEditId, availableSoundCards, setAvailableSoundCards, isSimulatorMode, setIsSimulatorMode, ytUrl, setYtUrl, ytPlayingVideo, setYtPlayingVideo, ytPlayingTitle, setYtPlayingTitle, ytCCOn, setYtCCOn, ytVideoPaused, setYtVideoPaused, ytSearchResults, setYtSearchResults, ytSearching, setYtSearching, inlinePreviewId, setInlinePreviewId, dialog, setDialog, playingPreviewSrc, setPlayingPreviewSrc, nowPlaying, setNowPlaying, bellPlaying, setBellPlaying, sidebarOpen, setSidebarOpen, mediaDuration, setMediaDuration, api, notify, userRole, curProfile, DAYS, ALL_WEEKDAYS, ALL_DAYS, systemMenuOpen, setSystemMenuOpen, systemHovered, setSystemHovered, showUserForm, setShowUserForm, newUser, setNewUser, systemSubTab, setSystemSubTab, playlists, playManual, queueManual, fetchDepartments, customConfirm, getSoundCardName, triggerLiveTestBell, PREDEFINED_COLORS, guessIcon, getSoundCardIcon, customPrompt, updateDevice, deleteDevice, fetchDevices, fetchFiles, API_URL, MiniPlayer, fetchPeriods, DayPicker, MiniPlayerProgress, handleVolumeChange, handleFadeInChange, fetchSchedules, ORG_PROFILES, changeOrgMode, fetchUsers, resumeYtVideoOnPlayer, pauseYtVideoOnPlayer, stopYtVideoOnPlayer, handleYtInputKeyDown, fastPlayYt } = ctx;

  
    const handleCreateUser = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        await api.post('/api/users', newUser);
        notify('Đã tạo tài khoản');
        setShowUserForm(false);
        setNewUser({ username: '', password: '', role: 'OPERATOR' });
        fetchUsers();
      } catch (err: any) {
        notify(err.response?.data?.error || 'Lỗi tạo tài khoản', 'err');
      }
    };

    const deleteUser = async (id: number) => {
      if (!(await customConfirm('Xóa tài khoản này?'))) return;
      try {
        await api.delete(`/api/users/${id}`);
        notify('Đã xóa tài khoản');
        fetchUsers();
      } catch (err: any) {
        notify(err.response?.data?.error || 'Lỗi xóa', 'err');
      }
    };

    const changePassword = async (id: number) => {
      const newPassword = await customPrompt('Nhập mật khẩu mới:');
      if (!newPassword) return;
      try {
        await api.put(`/api/users/${id}`, { newPassword });
        notify('Đã đổi mật khẩu');
      } catch {
        notify('Lỗi đổi mật khẩu', 'err');
      }
    };

    const changeRole = async (id: number, currentRole: string) => {
      const newRole = currentRole === 'ADMIN' ? 'OPERATOR' : 'ADMIN';
      const roleName = newRole === 'ADMIN' ? 'Quản trị viên' : 'Vận hành';
      if (!(await customConfirm(`Đổi quyền người dùng này thành ${roleName}?`))) return;
      try {
        await api.put(`/api/users/${id}`, { role: newRole });
        notify('Đã đổi quyền');
        fetchUsers();
      } catch {
        notify('Lỗi đổi quyền', 'err');
      }
    };

    return (
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2>Quản lý Tài khoản</h2>
          <button className="btn btn-primary btn-sm" onClick={() => setShowUserForm(true)}>{React.createElement('ion-icon', { name: 'add-outline' })} Tạo tài khoản</button>
        </div>
        
        {showUserForm && (
          <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '400px', width: '100%' }}>
              <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: 'var(--text)' }}>Thêm tài khoản mới</h3>
              <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Tên đăng nhập</label>
                  <input type="text" className="input" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} required style={{ width: '100%', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Mật khẩu</label>
                  <input type="password" className="input" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} required style={{ width: '100%', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Phân quyền</label>
                  <select className="input" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})} style={{ width: '100%', boxSizing: 'border-box' }}>
                    <option value="OPERATOR">Vận hành</option>
                    <option value="ADMIN">Quản trị viên</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-outline" onClick={() => setShowUserForm(false)}>Hủy</button>
                  <button type="submit" className="btn btn-primary">Xác nhận</button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {usersList.map(u => (
            <div key={u.id} style={{
              background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.25rem',
              display: 'flex', flexDirection: 'column', gap: '0.75rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: '1.1rem' }}>{u.username}</strong>
                <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: u.role === 'ADMIN' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', color: u.role === 'ADMIN' ? '#ef4444' : '#10b981', fontWeight: 600 }}>
                  {u.role === 'ADMIN' ? 'Quản trị viên' : 'Vận hành'}
                </span>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Ngày tạo: {formatDDMMYYYY(u.createdAt)}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
                <button className="btn btn-outline btn-xs" style={{ flex: 1 }} onClick={() => changePassword(u.id)}>Đổi mật khẩu</button>
                <button className="btn btn-outline btn-xs" style={{ flex: 1 }} onClick={() => changeRole(u.id, u.role)}>Đổi quyền</button>
                <button className="btn btn-danger-ghost btn-xs" onClick={() => deleteUser(u.id)}>Xóa</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  