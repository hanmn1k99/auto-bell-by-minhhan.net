
import React, { useContext, useState, useEffect, useRef } from 'react';
import { AdminContext } from './AdminContext';

export const PeriodsTab = () => {
  const ctx = useContext(AdminContext);
  // We will manually fix the destructuring later, or use ctx.foo in the code.
  // Actually, replacing all undefined variables with ctx.varName is hard.
  // Instead, we will destructure everything we can think of.
  const { tab, setTab, files, setFiles, schedules, setSchedules, bells, setBells, departments, setDepartments, periods, setPeriods, devices, setDevices, usersList, setUsersList, msg, setMsg, logoUrl, setLogoUrl, faviconUrl, setFaviconUrl, volume, setVolume, globalFadeInDuration, setGlobalFadeInDuration, orgMode, setOrgMode, fileUploading, setFileUploading, uploadProgress, setUploadProgress, selectedFileIds, setSelectedFileIds, addFileId, setAddFileId, newSchName, setNewSchName, selectedSch, setSelectedSch, pForm, setPForm, editingPeriod, setEditingPeriod, selectedPeriods, setSelectedPeriods, showBulkEditPeriod, setShowBulkEditPeriod, bulkEditPeriodForm, setBulkEditPeriodForm, bulkDep, setBulkDep, bulkAudio, setBulkAudio, bulkCount, setBulkCount, bulkStart, setBulkStart, bulkDuration, setBulkDuration, bulkBreak, setBulkBreak, bulkLongBreaks, setBulkLongBreaks, bulkDays, setBulkDays, bulkBaseName, setBulkBaseName, bulkPreview, setBulkPreview, depName, setDepName, depColor, setDepColor, depSoundCardId, setDepSoundCardId, depEditId, setDepEditId, availableSoundCards, setAvailableSoundCards, isSimulatorMode, setIsSimulatorMode, ytUrl, setYtUrl, ytPlayingVideo, setYtPlayingVideo, ytPlayingTitle, setYtPlayingTitle, ytCCOn, setYtCCOn, ytVideoPaused, setYtVideoPaused, ytSearchResults, setYtSearchResults, ytSearching, setYtSearching, inlinePreviewId, setInlinePreviewId, dialog, setDialog, playingPreviewSrc, setPlayingPreviewSrc, nowPlaying, setNowPlaying, bellPlaying, setBellPlaying, sidebarOpen, setSidebarOpen, mediaDuration, setMediaDuration, api, notify, userRole, curProfile, DAYS, ALL_WEEKDAYS, ALL_DAYS, systemMenuOpen, setSystemMenuOpen, systemHovered, setSystemHovered, showUserForm, setShowUserForm, newUser, setNewUser, systemSubTab, setSystemSubTab, playlists, playManual, queueManual, fetchDepartments, customConfirm, getSoundCardName, triggerLiveTestBell, PREDEFINED_COLORS, guessIcon, getSoundCardIcon, customPrompt, updateDevice, deleteDevice, fetchDevices, fetchFiles, API_URL, MiniPlayer, fetchPeriods, DayPicker, MiniPlayerProgress, handleVolumeChange, handleFadeInChange, fetchSchedules, ORG_PROFILES, changeOrgMode, fetchUsers, resumeYtVideoOnPlayer, pauseYtVideoOnPlayer, stopYtVideoOnPlayer, handleYtInputKeyDown, fastPlayYt } = ctx;

  
    const padT = (s: string) => s.padStart(2, '0');
    const minsToHHMM = (total: number) => {
      const h = Math.floor(total / 60);
      const m = total % 60;
      return `${padT(String(h))}:${padT(String(m))}:00`;
    };

    const generatePreview = () => {
      if (!bulkStart || bulkCount < 1) return;
      const [hh, mm] = bulkStart.split(':').map(Number);
      let cursor = hh * 60 + mm;
      const result: any[] = [];
      for (let i = 1; i <= bulkCount; i++) {
        const s = minsToHHMM(cursor);
        const e = minsToHHMM(cursor + bulkDuration);
        result.push({ name: `${bulkBaseName} ${i}`, startTime: s, endTime: e });
        
        const longBreak = bulkLongBreaks.find(b => b.afterPeriod === i);
        const breakTime = longBreak ? longBreak.duration : bulkBreak;
        
        cursor += bulkDuration + breakTime;
      }
      setBulkPreview(result);
    };

    const saveBulk = async () => {
      if (!bulkDep || !bulkAudio) return notify('Vui lòng chọn Khu vực và Âm thanh chuông ở Form tự động!', 'err');
    if (bulkPreview.length === 0) return notify('Cụ phải bấm nút Xem trước màu xám trước thì hệ thống mới có dữ liệu để Lưu ạ!', 'err');
      try {
        await api.post('/api/periods/bulk', {
          periods: bulkPreview.map(p => ({
            name: p.name,
            departmentId: Number(bulkDep),
            startTime: p.startTime,
            endTime: p.endTime,
            audioFileId: Number(bulkAudio),
            volume: 1.0,
            isActive: true,
            daysOfWeek: bulkDays,
          }))
        });
        setBulkPreview([]);
        fetchPeriods();
        notify(`Đã tạo ${bulkPreview.length} tiết!`);
      } catch { notify('Lỗi tạo hàng loạt', 'err'); }
    };

    const savePeriod = async () => {
      if (!pForm.departmentId || !pForm.startTime || !pForm.endTime || !pForm.audioFileId) return notify('Vui lòng điền đủ Tên, Khu vực, Thời gian và Âm thanh cho phần Thêm thủ công!', 'err');
      try {
        if (editingPeriod) {
          await api.put(`/api/periods/${editingPeriod.id}`, { ...pForm, departmentId: Number(pForm.departmentId), audioFileId: Number(pForm.audioFileId) });
          setEditingPeriod(null);
          notify('Đã cập nhật tiết!');
        } else {
          await api.post('/api/periods', { ...pForm, departmentId: Number(pForm.departmentId), audioFileId: Number(pForm.audioFileId) });
          notify('Đã thêm tiết!');
        }
        setPForm({ name: '', departmentId: '', startTime: '', endTime: '', audioFileId: '', volume: 1.0, isActive: true, daysOfWeek: ALL_WEEKDAYS });
        fetchPeriods();
      } catch { notify('Lỗi lưu tiết', 'err'); }
    };

    const openEdit = (p: any) => {
      setEditingPeriod(p);
      setPForm({ name: p.name, departmentId: String(p.departmentId), startTime: p.startTime, endTime: p.endTime, audioFileId: String(p.audioFileId), volume: p.volume, isActive: p.isActive, daysOfWeek: p.daysOfWeek });
    };


    const deletePeriod = async (id: number) => {
      if (!(await customConfirm('Xóa tiết này?'))) return;
      try { await api.delete(`/api/periods/${id}`); fetchPeriods(); }
      catch { notify('Lỗi xóa', 'err'); }
    };

    const handleBulkUpdatePeriods = async () => {
      if (selectedPeriods.length === 0) return;
      const payload: any = { ids: selectedPeriods };
      if (bulkEditPeriodForm.audioFileId) payload.audioFileId = Number(bulkEditPeriodForm.audioFileId);
      if (bulkEditPeriodForm.departmentId) payload.departmentId = Number(bulkEditPeriodForm.departmentId);
      if (bulkEditPeriodForm.daysOfWeek) payload.daysOfWeek = bulkEditPeriodForm.daysOfWeek;
      if (bulkEditPeriodForm.isActive !== 'no-change') payload.isActive = bulkEditPeriodForm.isActive === 'true';

      if (Object.keys(payload).length <= 1) {
        return notify('Vui lòng chọn ít nhất 1 thông tin cần sửa!', 'err');
      }

      try {
        await api.post('/api/periods/bulk-update', payload);
        setShowBulkEditPeriod(false);
        setBulkEditPeriodForm({ audioFileId: '', departmentId: '', daysOfWeek: '', isActive: 'no-change' });
        setSelectedPeriods([]);
        fetchPeriods();
        notify(`Đã sửa hàng loạt thành công ${selectedPeriods.length} ${curProfile.itemUnit}!`);
      } catch (err: any) {
        notify(err.response?.data?.error || 'Lỗi sửa hàng loạt ' + curProfile.itemUnit, 'err');
      }
    };

    const bulkDelete = async () => {
      if (selectedPeriods.length === 0) return;
      if (!(await customConfirm(`Xóa ${selectedPeriods.length} tiết đã chọn?`))) return;
      try {
        await api.post('/api/periods/bulk-delete', { ids: selectedPeriods });
        setSelectedPeriods([]);
        fetchPeriods();
        notify(`Đã xóa ${selectedPeriods.length} tiết!`);
      } catch { notify('Lỗi xóa hàng loạt', 'err'); }
    };

    const toggleSelect = (id: number) => setSelectedPeriods(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    const toggleAll = () => setSelectedPeriods(selectedPeriods.length === periods.length ? [] : periods.map(p => p.id));

    const fmtTime = (t: string) => t ? t.substring(0, 5) : '--:--';

    return (
      <div className="admin-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0 }}>{curProfile.tabLabel}</h2>
        </div>

        {/* ─── Modal sửa hàng loạt (Chỉ Nhạc chuông & Trạng thái) ─── */}
        {showBulkEditPeriod && (
          <div className="modal-overlay" style={{ zIndex: 1000 }}>
            <div className="modal-content" style={{ maxWidth: '480px', width: '100%', border: '1px solid var(--accent)' }}>
              <h3 style={{ marginTop: 0, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent)' }}>
                {React.createElement('ion-icon', { name: 'pencil-outline' })} Sửa hàng loạt {selectedPeriods.length} {curProfile.itemUnit}
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                Thay đổi đồng loạt {selectedPeriods.length} {curProfile.itemUnit} đã chọn.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label>Đổi Nhạc chuông hàng loạt</label>
                  <select className="input" value={bulkEditPeriodForm.audioFileId} onChange={e => setBulkEditPeriodForm({ ...bulkEditPeriodForm, audioFileId: e.target.value })}>
                    <option value="">-- Giữ nguyên nhạc cũ --</option>
                    {files.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label>Trạng thái Kích hoạt hàng loạt</label>
                  <select className="input" value={bulkEditPeriodForm.isActive} onChange={e => setBulkEditPeriodForm({ ...bulkEditPeriodForm, isActive: e.target.value })}>
                    <option value="no-change">-- Giữ nguyên trạng thái cũ --</option>
                    <option value="true">Bật kích hoạt tất cả</option>
                    <option value="false">Tắt kích hoạt tất cả</option>
                  </select>
                </div>
              </div>

              <div className="btn-row" style={{ marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                <button className="btn btn-primary" onClick={handleBulkUpdatePeriods}>
                  {React.createElement('ion-icon', { name: 'checkmark-circle-outline' })} Áp dụng sửa {selectedPeriods.length} {curProfile.itemUnit}
                </button>
                <button className="btn btn-ghost" onClick={() => { setShowBulkEditPeriod(false); setBulkEditPeriodForm({ audioFileId: '', departmentId: '', daysOfWeek: '', isActive: 'no-change' }); }}>
                  Hủy
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── Modal sửa riêng lẻ 1 mục ─── */}
        {editingPeriod && (
          <div className="modal-overlay" style={{ zIndex: 1000 }}>
            <div className="modal-content" style={{ maxWidth: '520px', width: '100%', border: '1px solid var(--primary)' }}>
              <h3 style={{ marginTop: 0, marginBottom: '1.25rem' }}>Sửa {curProfile.itemName.toLowerCase()}: {editingPeriod.name}</h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Tên {curProfile.itemUnit}</label>
                  <input type="text" className="input" value={pForm.name} onChange={e => setPForm({ ...pForm, name: e.target.value })} />
                </div>

                <div className="form-group">
                  <label>{curProfile.departmentLabel}</label>
                  <select className="input" value={pForm.departmentId} onChange={e => setPForm({ ...pForm, departmentId: e.target.value })}>
                    <option value="">Chọn khu vực...</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label>{curProfile.startTimeLabel} (HH:mm:ss)</label>
                  <input type="text" className="input" value={pForm.startTime} onChange={e => setPForm({ ...pForm, startTime: e.target.value })} />
                </div>

                <div className="form-group">
                  <label>{curProfile.endTimeLabel} (HH:mm:ss)</label>
                  <input type="text" className="input" value={pForm.endTime} onChange={e => setPForm({ ...pForm, endTime: e.target.value })} />
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Âm thanh chuông</label>
                  <select className="input" value={pForm.audioFileId} onChange={e => setPForm({ ...pForm, audioFileId: e.target.value })}>
                    <option value="">Chọn file nhạc...</option>
                    {files.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Ngày trong tuần</label>
                  <DayPicker value={pForm.daysOfWeek} onChange={v => setPForm({ ...pForm, daysOfWeek: v })} />
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input type="checkbox" id="edit-p-active" checked={pForm.isActive} onChange={e => setPForm({ ...pForm, isActive: e.target.checked })} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                  <label htmlFor="edit-p-active" style={{ cursor: 'pointer', fontWeight: 600 }}>Kích hoạt mục này</label>
                </div>
              </div>

              <div className="btn-row" style={{ marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                <button className="btn btn-primary" onClick={savePeriod}>
                  {React.createElement('ion-icon', { name: 'save-outline' })} Lưu thay đổi
                </button>
                <button className="btn btn-ghost" onClick={() => { setEditingPeriod(null); setPForm({ name: '', departmentId: '', startTime: '', endTime: '', audioFileId: '', volume: 1.0, isActive: true, daysOfWeek: ALL_WEEKDAYS }); }}>
                  Hủy
                </button>
              </div>
            </div>
          </div>
        )}

        
        {/* ─── Form tạo mục mới ─── */}
        <div className="card" style={{ marginBottom: '2rem', borderTop: '4px solid var(--accent)' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            {React.createElement('ion-icon', { name: 'add-circle', style: { color: 'var(--accent)', fontSize: '1.4rem' } })}
            Thêm {curProfile.itemName.toLowerCase()} thủ công
          </h3>
          
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  {React.createElement('ion-icon', { name: 'text-outline' })} Tên {curProfile.itemUnit}
                </label>
                <input type="text" className="input" value={pForm.name} onChange={e => setPForm({ ...pForm, name: e.target.value })} placeholder={`${curProfile.itemBaseDefault} 1`} />
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  {React.createElement('ion-icon', { name: curProfile.departmentIcon })} {curProfile.departmentLabel}
                </label>
                <select className="input" value={pForm.departmentId} onChange={e => setPForm({ ...pForm, departmentId: e.target.value })}>
                  <option value="">Chọn khu vực...</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  {React.createElement('ion-icon', { name: 'musical-notes-outline' })} Âm thanh chuông
                </label>
                <select className="input" value={pForm.audioFileId} onChange={e => setPForm({ ...pForm, audioFileId: e.target.value })}>
                  <option value="">Chọn file nhạc...</option>
                  {files.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginTop: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ color: '#22c55e', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    {React.createElement('ion-icon', { name: 'play-circle-outline' })} {curProfile.startTimeLabel}
                  </label>
                  <input type="text" className="input" value={pForm.startTime} onChange={e => setPForm({ ...pForm, startTime: e.target.value })} placeholder="08:00:00" />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    {React.createElement('ion-icon', { name: 'stop-circle-outline' })} {curProfile.endTimeLabel}
                  </label>
                  <input type="text" className="input" value={pForm.endTime} onChange={e => setPForm({ ...pForm, endTime: e.target.value })} placeholder="08:45:00" />
                </div>
              </div>
              
              <div className="form-group" style={{ margin: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  {React.createElement('ion-icon', { name: 'calendar-outline' })} Ngày trong tuần
                </label>
                <DayPicker value={pForm.daysOfWeek} onChange={v => setPForm({ ...pForm, daysOfWeek: v })} />
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button type="button" className="btn btn-xs btn-outline" onClick={() => setPForm({ ...pForm, daysOfWeek: ALL_WEEKDAYS })}>T2–T6</button>
                  <button type="button" className="btn btn-xs btn-outline" onClick={() => setPForm({ ...pForm, daysOfWeek: ALL_DAYS })}>Tất cả</button>
                </div>
              </div>
            </div>
          </div>

          <div className="btn-row" style={{ marginTop: '1.5rem', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" onClick={savePeriod} style={{ padding: '0.6rem 1.5rem' }}>
              {React.createElement('ion-icon', { name: 'add-outline', style: { marginRight: '6px' } })}
              Thêm {curProfile.itemUnit}
            </button>
          </div>
        </div>

        {/* ─── Tạo hàng loạt thông minh ─── */}
        <div className="card" style={{ marginBottom: '2rem', borderTop: '4px solid #8b5cf6', background: 'linear-gradient(to bottom right, var(--card-bg), rgba(139, 92, 246, 0.03))' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: '#a78bfa' }}>
            {React.createElement('ion-icon', { name: 'flash', style: { fontSize: '1.4rem' } })}
            Xếp {curProfile.itemUnit.toLowerCase()} tự động
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            
            {/* Block 1: Thông tin cơ bản */}
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)' }}>
              <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                {React.createElement('ion-icon', { name: 'information-circle-outline' })} Thông tin cơ bản
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>{curProfile.departmentLabel}</label>
                  <select className="input" value={bulkDep} onChange={e => setBulkDep(e.target.value)}>
                    <option value="">Chọn...</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Tiền tố tên (Vd: {curProfile.itemBaseDefault})</label>
                  <input type="text" className="input" value={bulkBaseName} onChange={e => setBulkBaseName(e.target.value)} placeholder={curProfile.itemBaseDefault} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Số lượng {curProfile.itemUnit}</label>
                  <input type="number" className="input" min={1} max={50} value={bulkCount} onChange={e => setBulkCount(Number(e.target.value))} />
                </div>
              </div>
            </div>

            {/* Block 2: Thời gian */}
            <div style={{ background: 'rgba(59, 130, 246, 0.05)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.15)' }}>
              <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                {React.createElement('ion-icon', { name: 'time-outline' })} Cấu hình Thời gian
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Giờ bắt đầu {curProfile.itemBaseDefault} 1</label>
                  <input type="text" className="input" value={bulkStart} onChange={e => setBulkStart(e.target.value)} placeholder="07:00" />
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div className="form-group" style={{ margin: 0, flex: 1 }}>
                    <label>Độ dài mỗi {curProfile.itemUnit} (phút)</label>
                    <input type="number" className="input" min={1} value={bulkDuration} onChange={e => setBulkDuration(Number(e.target.value))} />
                  </div>
                  <div className="form-group" style={{ margin: 0, flex: 1 }}>
                    <label>Nghỉ giữa giờ (phút)</label>
                    <input type="number" className="input" min={0} value={bulkBreak} onChange={e => setBulkBreak(Number(e.target.value))} />
                  </div>
                </div>
              </div>
            </div>

            {/* Block 3: Âm thanh & Ngày */}
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)' }}>
              <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                {React.createElement('ion-icon', { name: 'settings-outline' })} Âm thanh & Ngày áp dụng
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Âm thanh chuông</label>
                  <select className="input" value={bulkAudio} onChange={e => setBulkAudio(e.target.value)}>
                    <option value="">Chọn...</option>
                    {files.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Ngày trong tuần</label>
                  <DayPicker value={bulkDays} onChange={v => setBulkDays(v)} />
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button type="button" className={`btn btn-xs ${bulkDays === ALL_WEEKDAYS ? 'btn-primary' : 'btn-outline'}`} onClick={() => setBulkDays(ALL_WEEKDAYS)}>T2–T6</button>
                    <button type="button" className={`btn btn-xs ${bulkDays === ALL_DAYS ? 'btn-primary' : 'btn-outline'}`} onClick={() => setBulkDays(ALL_DAYS)}>Tất cả</button>
                  </div>
                </div>
              </div>
            </div>

          </div>
          
          {/* Block 4: Nghỉ dài / Nghỉ trưa */}
          <div style={{ marginTop: '1.5rem', background: 'rgba(0,0,0,0.15)', padding: '1.25rem', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {React.createElement('ion-icon', { name: 'cafe-outline', style: { color: '#f59e0b', fontSize: '1.2rem' } })}
                <span style={{ fontWeight: 600 }}>Cấu hình Nghỉ dài / Nghỉ trưa</span>
              </div>
              <button type="button" className="btn btn-sm" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '20px' }} onClick={() => setBulkLongBreaks([...bulkLongBreaks, { afterPeriod: 2, duration: 20 }])}>
                + Thêm giờ nghỉ dài
              </button>
            </div>
            
            {bulkLongBreaks.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                {bulkLongBreaks.map((lb, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--card-bg)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                    <span style={{ fontSize: '0.85rem' }}>Sau {curProfile.itemBaseDefault}</span>
                    <input type="number" className="input" style={{ width: '60px', padding: '0.25rem', textAlign: 'center' }} min={1} value={lb.afterPeriod} onChange={e => {
                      const next = [...bulkLongBreaks];
                      next[idx].afterPeriod = Number(e.target.value);
                      setBulkLongBreaks(next);
                    }} />
                    <span style={{ fontSize: '0.85rem' }}>nghỉ hẳn</span>
                    <input type="number" className="input" style={{ width: '70px', padding: '0.25rem', textAlign: 'center' }} min={0} value={lb.duration} onChange={e => {
                      const next = [...bulkLongBreaks];
                      next[idx].duration = Number(e.target.value);
                      setBulkLongBreaks(next);
                    }} />
                    <span style={{ fontSize: '0.85rem' }}>phút</span>
                    <button type="button" style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0.25rem' }} onClick={() => {
                      setBulkLongBreaks(bulkLongBreaks.filter((_, i) => i !== idx));
                    }} title="Xóa">
                      {React.createElement('ion-icon', { name: 'trash-outline', style: { fontSize: '1.1rem' } })}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        
          <div className="btn-row" style={{ marginTop: '1.5rem', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.5rem' }}>
            <button className="btn btn-outline" onClick={generatePreview}>
              {React.createElement('ion-icon', { name: 'eye-outline', style: { marginRight: '6px' } })}Xem trước
            </button>
            {bulkPreview.length > 0 && <button className="btn btn-primary" onClick={saveBulk}>
              {React.createElement('ion-icon', { name: 'save-outline', style: { marginRight: '6px' } })}Lưu {bulkPreview.length} {curProfile.itemUnit}
            </button>}
            {bulkPreview.length > 0 && <button className="btn btn-ghost" onClick={() => setBulkPreview([])}>Xóa preview</button>}
          </div>

          {bulkPreview.length > 0 && (
            <div style={{ marginTop: '1.5rem', overflowX: 'auto', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
              <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text)', fontSize: '0.95rem' }}>Bảng xem trước ({bulkPreview.length} {curProfile.itemUnit})</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ background: 'var(--card-bg)' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>Tên</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>{curProfile.startTimeLabel}</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>{curProfile.endTimeLabel}</th>
                  </tr>
                </thead>
                <tbody>
                  {bulkPreview.map((p, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 600 }}>{p.name}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center', color: '#22c55e' }}>{fmtTime(p.startTime)}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center', color: '#ef4444' }}>{fmtTime(p.endTime)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

{/* ─── Danh sách {curProfile.itemUnit} ─── */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3>Danh sách {curProfile.itemUnit} ({periods.length})</h3>
            {selectedPeriods.length > 0 && (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '0.9rem' }}>Đã chọn {selectedPeriods.length} {curProfile.itemUnit}</span>
                <button className="btn btn-outline btn-sm" onClick={() => setShowBulkEditPeriod(true)}>
                  {React.createElement('ion-icon', { name: 'pencil-outline', style: { marginRight: '4px' } })} Sửa hàng loạt
                </button>
                <button className="btn btn-danger-ghost btn-sm" onClick={bulkDelete}>
                  {React.createElement('ion-icon', { name: 'trash-outline', style: { marginRight: '4px' } })} Xóa hàng loạt
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setSelectedPeriods([])}>Bỏ chọn</button>
              </div>
            )}
          </div>
          {periods.length === 0 && <div className="empty-state">Chưa có {curProfile.itemUnit} nào</div>}
          {periods.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ background: 'var(--card-bg)' }}>
                    <th style={{ padding: '8px 12px', width: '32px' }}>
                      <input type="checkbox" checked={selectedPeriods.length === periods.length && periods.length > 0} onChange={toggleAll} />
                    </th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>Tên {curProfile.itemUnit}</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>{curProfile.startTimeLabel}</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>{curProfile.endTimeLabel}</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>{curProfile.departmentLabel}</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>Nhạc chuông</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>Ngày</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {periods.map(p => (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--border)', opacity: p.isActive ? 1 : 0.5 }}>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        <input type="checkbox" checked={selectedPeriods.includes(p.id)} onChange={() => toggleSelect(p.id)} />
                      </td>
                      <td style={{ padding: '8px 12px', fontWeight: 600, maxWidth: '160px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={p.name}>{p.name}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        <span style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>{fmtTime(p.startTime)}</span>
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        <span style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>{fmtTime(p.endTime)}</span>
                      </td>
                      <td style={{ padding: '8px 12px', maxWidth: '140px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={p.department?.name}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: p.department?.color || 'var(--primary)', display: 'inline-block', flexShrink: 0 }}></span>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.department?.name}</span>
                        </span>
                      </td>
                      <td style={{ padding: '8px 12px', color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: '180px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={p.audioFile?.name}>{p.audioFile?.name}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {p.daysOfWeek.split(',').map((d: string) => DAYS[Number(d)]).join(' ')}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                          <button className="btn btn-icon" title="Sửa" style={{ color: 'var(--accent)' }} onClick={() => openEdit(p)}>
                            {React.createElement('ion-icon', { name: 'create-outline' })}
                          </button>
                          <button className="btn btn-icon btn-danger-ghost" title="Xóa" onClick={() => deletePeriod(p.id)}>
                            {React.createElement('ion-icon', { name: 'trash-outline' })}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  