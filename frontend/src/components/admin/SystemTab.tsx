import { Users } from './Users';
import { Devices } from './Devices';
import type { OrgMode } from '../../AdminPage';

import React, { useContext, useState, useEffect, useRef } from 'react';
import { AdminContext } from './AdminContext';

export const SystemTab = () => {
  const ctx = useContext(AdminContext);
  // We will manually fix the destructuring later, or use ctx.foo in the code.
  // Actually, replacing all undefined variables with ctx.varName is hard.
  // Instead, we will destructure everything we can think of.
  const { tab, setTab, files, setFiles, schedules, setSchedules, bells, setBells, departments, setDepartments, periods, setPeriods, devices, setDevices, usersList, setUsersList, msg, setMsg, logoUrl, setLogoUrl, faviconUrl, setFaviconUrl, volume, setVolume, globalFadeInDuration, setGlobalFadeInDuration, orgMode, setOrgMode, fileUploading, setFileUploading, uploadProgress, setUploadProgress, selectedFileIds, setSelectedFileIds, addFileId, setAddFileId, newSchName, setNewSchName, selectedSch, setSelectedSch, pForm, setPForm, editingPeriod, setEditingPeriod, selectedPeriods, setSelectedPeriods, showBulkEditPeriod, setShowBulkEditPeriod, bulkEditPeriodForm, setBulkEditPeriodForm, bulkDep, setBulkDep, bulkAudio, setBulkAudio, bulkCount, setBulkCount, bulkStart, setBulkStart, bulkDuration, setBulkDuration, bulkBreak, setBulkBreak, bulkLongBreaks, setBulkLongBreaks, bulkDays, setBulkDays, bulkBaseName, setBulkBaseName, bulkPreview, setBulkPreview, depName, setDepName, depColor, setDepColor, depSoundCardId, setDepSoundCardId, depEditId, setDepEditId, availableSoundCards, setAvailableSoundCards, isSimulatorMode, setIsSimulatorMode, ytUrl, setYtUrl, ytPlayingVideo, setYtPlayingVideo, ytPlayingTitle, setYtPlayingTitle, ytCCOn, setYtCCOn, ytVideoPaused, setYtVideoPaused, ytSearchResults, setYtSearchResults, ytSearching, setYtSearching, inlinePreviewId, setInlinePreviewId, dialog, setDialog, playingPreviewSrc, setPlayingPreviewSrc, nowPlaying, setNowPlaying, bellPlaying, setBellPlaying, sidebarOpen, setSidebarOpen, mediaDuration, setMediaDuration, api, notify, userRole, curProfile, DAYS, ALL_WEEKDAYS, ALL_DAYS, systemMenuOpen, setSystemMenuOpen, systemHovered, setSystemHovered, showUserForm, setShowUserForm, newUser, setNewUser, systemSubTab, setSystemSubTab, playlists, playManual, queueManual, fetchDepartments, customConfirm, getSoundCardName, triggerLiveTestBell, PREDEFINED_COLORS, guessIcon, getSoundCardIcon, customPrompt, updateDevice, deleteDevice, fetchDevices, fetchFiles, API_URL, MiniPlayer, fetchPeriods, DayPicker, MiniPlayerProgress, handleVolumeChange, handleFadeInChange, fetchSchedules, ORG_PROFILES, changeOrgMode, fetchUsers, resumeYtVideoOnPlayer, pauseYtVideoOnPlayer, stopYtVideoOnPlayer, handleYtInputKeyDown, fastPlayYt } = ctx;

  return (
    <div className="admin-section">
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.5rem' }}>
          {systemSubTab === 'devices' && 'Quản lý Thiết bị'}
          {systemSubTab === 'users' && 'Quản lý Tài khoản'}
          {systemSubTab === 'profile' && 'Cấu hình System'}
        </h2>
      </div>

      {systemSubTab === 'profile' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Hàng 1: 2 Cột Đối xứng (Chọn Mô hình + Xem trước Thuật ngữ) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
            {/* Cột 1: Danh sách Chọn Mô hình */}
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.5rem' }}>
              <h3 style={{ marginTop: 0, marginBottom: '0.5rem', fontSize: '1.1rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {React.createElement('ion-icon', { name: 'options-outline', style: { color: 'var(--accent)' } })}
                Chọn Loại hình Tổ chức
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                Lựa chọn mô hình vận hành phù hợp cho hệ thống của bạn.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {(Object.keys(ORG_PROFILES) as OrgMode[]).map((modeKey) => {
                  const prof = ORG_PROFILES[modeKey];
                  const isSelected = orgMode === modeKey;
                  return (
                    <div 
                      key={modeKey}
                      onClick={() => changeOrgMode(modeKey)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        padding: '0.95rem 1.1rem',
                        background: isSelected ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.02)',
                        border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border)',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ 
                        width: '38px', height: '38px', borderRadius: '10px', 
                        background: isSelected ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                        color: isSelected ? '#fff' : 'var(--text-muted)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.35rem', flexShrink: 0
                      }}>
                        {React.createElement('ion-icon', { name: prof.icon })}
                      </div>
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.95rem', color: isSelected ? '#fff' : 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {prof.name}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                          {prof.tabLabel}
                        </div>
                      </div>
                      {isSelected && (
                        <div style={{ color: 'var(--accent)', fontSize: '1.25rem', display: 'flex', alignItems: 'center' }}>
                          {React.createElement('ion-icon', { name: 'checkmark-circle' })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Cột 2: Bảng Trực quan hóa Thuật ngữ Giao diện */}
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.5rem' }}>
              <h3 style={{ marginTop: 0, marginBottom: '0.5rem', fontSize: '1.1rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {React.createElement('ion-icon', { name: 'eye-outline', style: { color: 'var(--accent)' } })}
                Xem trước Thuật ngữ Giao diện
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                Thuật ngữ được tự động đồng bộ hóa trên toàn bộ menu và bảng biểu.
              </p>

              <div style={{ background: 'rgba(11, 15, 26, 0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Tên Menu chính:</span>
                  <span style={{ fontWeight: 600, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.95rem' }}>
                    {React.createElement('ion-icon', { name: curProfile.icon })} {curProfile.tabLabel}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Mốc Bắt đầu</div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#22c55e', marginTop: '0.2rem' }}>{curProfile.startTimeLabel}</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Mốc Kết thúc</div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#ef4444', marginTop: '0.2rem' }}>{curProfile.endTimeLabel}</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tên Phân loại</div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#3b82f6', marginTop: '0.2rem' }}>{curProfile.departmentLabel}</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Đơn vị {curProfile.itemName}</div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#f59e0b', marginTop: '0.2rem' }}>{curProfile.itemUnit}</div>
                  </div>
                </div>

                <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px dashed rgba(59,130,246,0.3)', padding: '0.85rem', borderRadius: '8px', marginTop: '0.25rem' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Tạo tự động:</div>
                  <div style={{ fontSize: '0.83rem', color: '#e2e8f0', fontStyle: 'italic', lineHeight: '1.4' }}>
                    "{curProfile.batchDescription}"
  return (
    <div className="admin-section">
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.5rem' }}>
          {systemSubTab === 'devices' && 'Quản lý Thiết bị'}
          {systemSubTab === 'users' && 'Quản lý Tài khoản'}
          {systemSubTab === 'profile' && 'Cấu hình System'}
        </h2>
      </div>

      {systemSubTab === 'profile' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Hàng 1: 2 Cột Đối xứng (Chọn Mô hình + Xem trước Thuật ngữ) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
            {/* Cột 1: Danh sách Chọn Mô hình */}
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.5rem' }}>
              <h3 style={{ marginTop: 0, marginBottom: '0.5rem', fontSize: '1.1rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {React.createElement('ion-icon', { name: 'options-outline', style: { color: 'var(--accent)' } })}
                Chọn Loại hình Tổ chức
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                Lựa chọn mô hình vận hành phù hợp cho hệ thống của bạn.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {(Object.keys(ORG_PROFILES) as OrgMode[]).map((modeKey) => {
                  const prof = ORG_PROFILES[modeKey];
                  const isSelected = orgMode === modeKey;
                  return (
                    <div 
                      key={modeKey}
                      onClick={() => changeOrgMode(modeKey)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        padding: '0.95rem 1.1rem',
                        background: isSelected ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.02)',
                        border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border)',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ 
                        width: '38px', height: '38px', borderRadius: '10px', 
                        background: isSelected ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                        color: isSelected ? '#fff' : 'var(--text-muted)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.35rem', flexShrink: 0
                      }}>
                        {React.createElement('ion-icon', { name: prof.icon })}
                      </div>
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.95rem', color: isSelected ? '#fff' : 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {prof.name}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                          {prof.tabLabel}
                        </div>
                      </div>
                      {isSelected && (
                        <div style={{ color: 'var(--accent)', fontSize: '1.25rem', display: 'flex', alignItems: 'center' }}>
                          {React.createElement('ion-icon', { name: 'checkmark-circle' })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Cột 2: Bảng Trực quan hóa Thuật ngữ Giao diện */}
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.5rem' }}>
              <h3 style={{ marginTop: 0, marginBottom: '0.5rem', fontSize: '1.1rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {React.createElement('ion-icon', { name: 'eye-outline', style: { color: 'var(--accent)' } })}
                Xem trước Thuật ngữ Giao diện
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                Thuật ngữ được tự động đồng bộ hóa trên toàn bộ menu và bảng biểu.
              </p>

              <div style={{ background: 'rgba(11, 15, 26, 0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Tên Menu chính:</span>
                  <span style={{ fontWeight: 600, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.95rem' }}>
                    {React.createElement('ion-icon', { name: curProfile.icon })} {curProfile.tabLabel}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Mốc Bắt đầu</div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#22c55e', marginTop: '0.2rem' }}>{curProfile.startTimeLabel}</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Mốc Kết thúc</div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#ef4444', marginTop: '0.2rem' }}>{curProfile.endTimeLabel}</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tên Phân loại</div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#3b82f6', marginTop: '0.2rem' }}>{curProfile.departmentLabel}</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Đơn vị {curProfile.itemName}</div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#f59e0b', marginTop: '0.2rem' }}>{curProfile.itemUnit}</div>
                  </div>
                </div>

                <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px dashed rgba(59,130,246,0.3)', padding: '0.85rem', borderRadius: '8px', marginTop: '0.25rem' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Tạo tự động:</div>
                  <div style={{ fontSize: '0.83rem', color: '#e2e8f0', fontStyle: 'italic', lineHeight: '1.4' }}>
                    "{curProfile.batchDescription}"
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Hàng 2: Thẻ Cấu hình Sound Card & Simulator (Toàn Chiều rộng Full-Width) */}
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ marginTop: 0, marginBottom: '0.25rem', fontSize: '1.1rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {React.createElement('ion-icon', { name: 'hardware-chip-outline', style: { color: 'var(--accent)' } })}
                  Cấu hình Phân luồng Âm thanh & Kênh Giả lập
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                  Quản lý các luồng thiết bị âm thanh phần cứng và Chế độ Giả lập Đa kênh.
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
              {/* Box Chế độ Giả lập */}
              <div style={{ background: 'rgba(11, 15, 26, 0.6)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <span style={{ fontWeight: 600, color: '#fff', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    {React.createElement('ion-icon', { name: 'disc-outline', style: { color: '#10b981' } })} Chế độ Giả lập Đa kênh
                  </span>
                  <input 
                    type="checkbox" 
                    checked={isSimulatorMode} 
                    onChange={(e) => {
                      const val = e.target.checked;
                      setIsSimulatorMode(val);
                      localStorage.setItem('isSimulatorMode', String(val));
                      notify(val ? 'Đã bật Chế độ Giả lập Đa kênh' : 'Đã tắt Chế độ Giả lập');
                    }} 
                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--accent)' }}
                  />
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4', margin: 0 }}>
                  Thử nghiệm phát đa kênh ảo qua tai nghe, kèm theo VU Meter.
                </p>
              </div>

              {/* Danh sách Card trực tuyến */}
              <div style={{ background: 'rgba(11, 15, 26, 0.6)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.25rem' }}>
                <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.95rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  {React.createElement('ion-icon', { name: 'list-outline', style: { color: '#3b82f6' } })} Thiết bị âm thanh trực tuyến ({availableSoundCards.length} Player)
                </div>
                {availableSoundCards.length === 0 ? (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    Chưa có thiết bị nào. Cần mở trang Player và cho phép Microphone.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '300px', overflowY: 'auto' }}>
                    {availableSoundCards.map((device) => (
                      <div key={device.deviceId} style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#60a5fa', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          {React.createElement('ion-icon', { name: 'desktop-outline' })} {device.deviceName}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                          {device.cards.map(card => {
                            const scId = `${device.deviceId}::${card.deviceId}`;
                            return (
                              <div key={scId} style={{ fontSize: '0.82rem', color: '#e2e8f0', background: 'rgba(255,255,255,0.03)', padding: '0.5rem 0.75rem', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', overflow: 'hidden' }}>
                                  {React.createElement('ion-icon', { name: 'volume-high-outline', style: { color: '#10b981', flexShrink: 0 } })} 
                                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {card.label}
                                  </span>
                                </div>
                                <button 
                                  type="button" 
                                  className="btn btn-xs btn-outline" 
                                  onClick={() => triggerLiveTestBell(scId)} 
                                  title="Phát tiếng thử nghiệm để xác định loa"
                                  style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', padding: '0.25rem 0.6rem', borderColor: 'var(--accent)', color: 'var(--accent)', flexShrink: 0 }}
                                >
                                  {React.createElement('ion-icon', { name: 'volume-high-outline' })} Âm thử
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {systemSubTab === 'users' && <Users />}
      {systemSubTab === 'devices' && <Devices />}
    </div>
  
  );
};
  