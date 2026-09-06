
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, useDroppable } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { SortableFile } from './SortableFile';
import axios from 'axios';
import React, { useContext, useState, useEffect, useRef } from 'react';
import { CustomSelect } from './CustomSelect';
import { AdminContext } from './AdminContext';
import { CSS } from "@dnd-kit/utilities";

const DroppableFolder = ({ id, isSortable, onClick, isActive, onRename, onDelete, name }: any) => {
      const { isOver: isDroppableOver, setNodeRef: setDroppableRef } = useDroppable({ id: 'folder-drop-' + id });
      
      const { attributes, listeners, setNodeRef: setSortableRef, transform, transition, isDragging } = useSortable({ id: 'folder-' + id });
      
      const setRef = (node: any) => {
        setDroppableRef(node);
        if (isSortable) setSortableRef(node);
      };
      
      const style = isSortable ? { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 } : {};
      
      return (
        <div 
          ref={setRef} 
          className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-outline'}`} 
          onClick={onClick} 
          style={{ ...style, display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap', flexShrink: 0, cursor: isSortable ? 'grab' : 'pointer', paddingRight: '0.4rem', border: isDroppableOver ? '2px dashed var(--primary)' : undefined }}
          {...(isSortable ? attributes : {})}
          {...(isSortable ? listeners : {})}
        >
          {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
          {/* @ts-ignore */}
          {React.createElement('ion-icon', { name: 'folder' })} {name}
          {isSortable && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginLeft: '0.3rem', opacity: 0.7 }}>
              <span onClick={(e) => { e.stopPropagation(); onRename(); }} style={{ padding: '0 3px', cursor: 'pointer' }} title="Đổi tên">
                {/* @ts-ignore */}
                {React.createElement('ion-icon', { name: 'pencil' })}
              </span>
              <span onClick={(e) => { e.stopPropagation(); onDelete(); }} style={{ padding: '0 3px', cursor: 'pointer' }} title="Xóa">
                {/* @ts-ignore */}
                {React.createElement('ion-icon', { name: 'trash' })}
              </span>
            </div>
          )}
        </div>
      );
    };
export const Files = () => {
  const ctx = useContext(AdminContext);
  // We will manually fix the destructuring later, or use ctx.foo in the code.
  // Actually, replacing all undefined variables with ctx.varName is hard.
  // Instead, we will destructure everything we can think of.
  const { tab, setTab, files, setFiles, schedules, setSchedules, bells, setBells, departments, setDepartments, periods, setPeriods, devices, setDevices, usersList, setUsersList, msg, setMsg, logoUrl, setLogoUrl, faviconUrl, setFaviconUrl, volume, setVolume, globalFadeInDuration, setGlobalFadeInDuration, orgMode, setOrgMode, fileUploading, setFileUploading, uploadProgress, setUploadProgress, selectedFileIds, setSelectedFileIds, addFileId, setAddFileId, newSchName, setNewSchName, selectedSch, setSelectedSch, pForm, setPForm, editingPeriod, setEditingPeriod, selectedPeriods, setSelectedPeriods, showBulkEditPeriod, setShowBulkEditPeriod, bulkEditPeriodForm, setBulkEditPeriodForm, bulkDep, setBulkDep, bulkAudio, setBulkAudio, bulkCount, setBulkCount, bulkStart, setBulkStart, bulkDuration, setBulkDuration, bulkBreak, setBulkBreak, bulkLongBreaks, setBulkLongBreaks, bulkDays, setBulkDays, bulkBaseName, setBulkBaseName, bulkPreview, setBulkPreview, depName, setDepName, depColor, setDepColor, depSoundCardId, setDepSoundCardId, depEditId, setDepEditId, availableSoundCards, setAvailableSoundCards, isSimulatorMode, setIsSimulatorMode, ytUrl, setYtUrl, ytPlayingVideo, setYtPlayingVideo, ytPlayingTitle, setYtPlayingTitle, ytCCOn, setYtCCOn, ytVideoPaused, setYtVideoPaused, ytSearchResults, setYtSearchResults, ytSearching, setYtSearching, inlinePreviewId, setInlinePreviewId, dialog, setDialog, playingPreviewSrc, setPlayingPreviewSrc, nowPlaying, setNowPlaying, bellPlaying, setBellPlaying, sidebarOpen, setSidebarOpen, mediaDuration, setMediaDuration, api, notify, userRole, curProfile, DAYS, ALL_WEEKDAYS, ALL_DAYS, systemMenuOpen, setSystemMenuOpen, systemHovered, setSystemHovered, showUserForm, setShowUserForm, newUser, setNewUser, systemSubTab, setSystemSubTab, playlists, playManual, queueManual, fetchDepartments, customConfirm, getSoundCardName, triggerLiveTestBell, PREDEFINED_COLORS, guessIcon, getSoundCardIcon, customPrompt, updateDevice, deleteDevice, fetchDevices, fetchFiles, fetchFolders, folders, API_URL, MiniPlayer, fetchPeriods, DayPicker, MiniPlayerProgress, handleVolumeChange, handleFadeInChange, fetchSchedules, ORG_PROFILES, changeOrgMode, fetchUsers, resumeYtVideoOnPlayer, pauseYtVideoOnPlayer, stopYtVideoOnPlayer, handleYtInputKeyDown, fastPlayYt } = ctx;

  
    

    const [selectedFolderId, setSelectedFolderId] = useState<number | 'all' | 'unassigned'>('all');
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    if (active.id !== over.id) {
      const activeFile = files.find(f => f.id.toString() === active.id);
      const overFile = files.find(f => f.id.toString() === over.id);
      
      // Only allow reordering within the same folder
      if (activeFile && overFile && activeFile.folderId === overFile.folderId) {
        const folderFiles = files.filter(f => f.folderId === activeFile.folderId);
        const oldIndex = folderFiles.findIndex(f => f.id.toString() === active.id);
        const newIndex = folderFiles.findIndex(f => f.id.toString() === over.id);
        
        const newFolderFiles = arrayMove(folderFiles, oldIndex, newIndex) as any[];
        
        // Construct the new complete ordered IDs array
        // We only update the order for files in this folder, leaving others intact
        const orderedIds = newFolderFiles.map(f => f.id);
        
        try {
          await axios.put(`${API_URL}/api/files/reorder`, { orderedIds }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
          fetchFiles();
        } catch (e) {
          console.error(e);
        }
      }
    }
  };

  const toggleFolderCollapse = (fId: string) => setCollapsedFolders(prev => ({...prev, [fId]: !prev[fId]}));



    const createFolder = async () => {
      const name = await customPrompt('Nhập tên thư mục mới:');
      if (!name) return;
      try {
        await api.post('/api/files/folders', { name });
        fetchFolders();
        notify('Đã tạo thư mục');
      } catch (err: any) {
        notify(err.response?.data?.error || 'Lỗi tạo thư mục', 'err');
      }
    };

    const renameFolder = async (id: number, oldName: string) => {
      const name = await customPrompt('Nhập tên mới:', oldName);
      if (!name || name === oldName) return;
      try {
        await api.put(`/api/files/folders/${id}`, { name });
        fetchFolders();
      } catch (err: any) {
        notify(err.response?.data?.error || 'Lỗi đổi tên', 'err');
      }
    };

    const deleteFolder = async (id: number) => {
      if (!(await customConfirm('Xóa thư mục này? Các file bên trong sẽ không bị xóa mà chuyển về Chưa phân loại.'))) return;
      try {
        await api.delete(`/api/files/folders/${id}`);
        if (selectedFolderId === id) setSelectedFolderId('all');
        fetchFolders();
        fetchFiles(); // files might have been unassigned
        notify('Đã xóa thư mục');
      } catch (err: any) {
        notify(err.response?.data?.error || 'Lỗi xóa', 'err');
      }
    };

    const moveFiles = async (folderId: number | null) => {
      if (selectedFileIds.length === 0) return;
      try {
        await Promise.all(selectedFileIds.map(id => api.put(`/api/files/${id}/move`, { folderId })));
        setSelectedFileIds([]);
        fetchFiles();
        notify('Đã chuyển file');
      } catch (err: any) {
        notify(err.response?.data?.error || 'Lỗi di chuyển', 'err');
      }
    };

    const toggleSelectFile = (id: number) => {
      setSelectedFileIds(prev =>
        prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
      );
    };

    const toggleSelectAll = () => {
      if (files.length > 0 && selectedFileIds.length === files.length) {
        setSelectedFileIds([]);
      } else {
        setSelectedFileIds(files.map(f => f.id));
      }
    };

    const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const filesToUpload = Array.from(e.target.files || []);
      if (filesToUpload.length === 0) return;
      setFileUploading(true);
      
      let successCount = 0;
      let errorCount = 0;
      const BATCH_SIZE = 50;

      for (let i = 0; i < filesToUpload.length; i += BATCH_SIZE) {
        const batch = filesToUpload.slice(i, i + BATCH_SIZE);
        setUploadProgress(`Đang tải ${Math.min(i + BATCH_SIZE, filesToUpload.length)}/${filesToUpload.length}...`);
        
        const fd = new FormData();
        batch.forEach(f => fd.append('audio', f));
        if (typeof selectedFolderId === 'number') {
          fd.append('folderId', String(selectedFolderId));
        }
        
        try {
          const res = await api.post('/api/files/upload', fd);
          successCount += res.data.files?.length || batch.length;
        } catch {
          errorCount += batch.length;
        }
      }

      fetchFiles(); setFileUploading(false);
      setUploadProgress('');
      notify(`Tải xong ${successCount} file. ${errorCount ? `Lỗi ${errorCount} file.` : ''}`); syncFiles(true);
    };
    
    const del = async (id: number) => {
      if (!(await customConfirm('Xóa tệp này?'))) return;
      try {
        await api.delete(`/api/files/${id}`);
        setSelectedFileIds(prev => prev.filter(i => i !== id)); fetchFiles();
        notify('Đã xóa');
      } catch (err: any) {
        notify(err.response?.data?.error || 'Lỗi xóa tệp', 'err');
      }
    };

    const [syncStatus, setSyncStatus] = useState<string | null>(null);

    const syncFiles = async (silent?: boolean) => {
      try {
        const res = await api.post('/api/files/sync');
        if (res.data.status === 'started' || res.data.status === 'already_running') {
           setSyncStatus('Đang chuẩn bị...');
           if (!silent) notify('Đã bắt đầu tiến trình đồng bộ ngầm trên server.');
           
           // Bắt đầu polling
           const pollInterval = setInterval(async () => {
             try {
               const stRes = await api.get('/api/files/sync/status');
               if (stRes.data.isRunning) {
                 setSyncStatus(stRes.data.progress);
               } else {
                 clearInterval(pollInterval);
                 setSyncStatus(null);
                 if (stRes.data.error) {
                   notify(stRes.data.error, 'err');
                 } else {
                   notify(`Đồng bộ xong! Đã thêm ${stRes.data.addedCount} tệp, xóa ${stRes.data.deletedCount} tệp.`);
                   fetchFiles();
                   fetchFolders();
                 }
               }
             } catch (e) {
                console.error(e);
             }
           }, 2000);
        } else {
           // Fallback cho API cũ
           const { addedCount = 0, deletedCount = 0 } = res.data;
           if (!silent) {
             notify(`Đồng bộ xong! Đã nạp ${addedCount} tệp mới, xóa ${deletedCount} tệp không còn trên máy chủ.`);
           }
           setSelectedFileIds([]); fetchFiles(); fetchFolders();
        }
      } catch (err: any) {
        notify(err.response?.data?.error || 'Lỗi đồng bộ tệp', 'err');
      }
    };
    const bulkDelete = async () => {
      if (selectedFileIds.length === 0) return;
      if (!(await customConfirm(`Bạn có chắc chắn muốn xóa ${selectedFileIds.length} tệp đã chọn?`))) return;
      try {
        const res = await api.post('/api/files/bulk-delete', { ids: selectedFileIds });
        const { deletedCount, skippedFiles } = res.data;
        setSelectedFileIds([]); fetchFiles();
        if (skippedFiles && skippedFiles.length > 0) {
          notify(`Đã xóa ${deletedCount} tệp. Bỏ qua ${skippedFiles.length} tệp do đang dùng trong ${curProfile.itemName}.`);
        } else {
          notify(`Đã xóa thành công ${deletedCount} tệp!`);
        }
      } catch (err: any) {
        notify(err.response?.data?.error || 'Lỗi xóa nhiều tệp', 'err');
      }
    };
    
const renameFile = async (id: number, currentName: string) => {
      const newName = await customPrompt('Nhập tên mới cho file:', currentName);
      if (!newName || newName === currentName) return;
      try {
        await api.put(`/api/files/${id}`, { name: newName });
        notify('Đã đổi tên file'); fetchFiles();
      } catch {
        notify('Đổi tên thất bại', 'err');
      }
    };
    const uploadAsset = async (type: 'logo' | 'favicon', e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files?.length) return;
      const fd = new FormData();
      fd.append(type, e.target.files[0]);
      try {
        const res = await api.post(`/api/files/upload-${type}`, fd);
        const fullUrl = `${API_URL}${res.data.url}?t=${Date.now()}`;
        if (type === 'logo') setLogoUrl(fullUrl);
        if (type === 'favicon') setFaviconUrl(fullUrl);
        notify(`Đã cập nhật ${type === 'logo' ? 'Logo' : 'Favicon'} thành công!`);
      } catch { notify('Lỗi tải lên hình ảnh', 'err'); }
    };

    const deleteAsset = async (type: 'logo' | 'favicon') => {
      if (!(await customConfirm(`Bạn có chắc muốn xóa ${type === 'logo' ? 'Logo' : 'Favicon'}?`))) return;
      try {
        await api.delete(`/api/files/assets/${type}`);
        notify(`Đã xóa ${type === 'logo' ? 'Logo' : 'Favicon'}!`);
        if (type === 'logo') setLogoUrl(null);
        if (type === 'favicon') setFaviconUrl(null);
      } catch {
        notify(`Lỗi xóa ${type}`, 'err');
      }
    };

    
  const renderFile = (f: any) => {
    const isSelected = selectedFileIds.includes(f.id);
    return (
      <SortableFile id={'file-' + f.id} key={f.id}>
        <div className={`file-item ${isSelected ? 'selected' : ''}`} style={{
        ...(isSelected ? { background: 'rgba(134, 59, 255, 0.12)', borderColor: '#863bff' } : {}),
        marginBottom: 0, 
        padding: '0.5rem 0.75rem',
        display: 'flex', 
        alignItems: 'center',
        gap: '0.5rem',
        borderRadius: '8px',
        border: '1px solid var(--border)',
        background: 'rgba(255, 255, 255, 0.03)'
      }}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => toggleSelectFile(f.id)}
          style={{ cursor: 'pointer', width: '16px', height: '16px', flexShrink: 0, margin: 0 }}
        />
        <span className="file-icon" style={{ flexShrink: 0, display: 'flex', alignItems: 'center', color: 'var(--accent)' }}>{React.createElement('ion-icon', { name: 'musical-note' })}</span>
        
        <div style={{ minWidth: 0, flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.9rem', fontWeight: 500 }} title={f.name}>{f.name}</span>
          <button className="btn btn-ghost btn-xs" onClick={() => renameFile(f.id, f.name)} title="Đổi tên" style={{ padding: '2px 4px', flexShrink: 0, opacity: 0.7 }}>{React.createElement('ion-icon', { name: 'pencil-outline' })}</button>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
          <MiniPlayer src={`${API_URL}${f.path}`} />
          <button className="btn btn-icon btn-danger-ghost" onClick={() => del(f.id)} title="Xóa" style={{ width: '28px', height: '28px' }}>
            {React.createElement('ion-icon', { name: 'trash-outline' })}
          </button>
        </div>
      </div>
      </SortableFile>
    );
  };
  return (
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="admin-section">
        <h2>Quản lý tệp</h2>

        <div className="card mb-4" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginTop: 0, marginBottom: '1.25rem', fontSize: '1.05rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {React.createElement('ion-icon', { name: 'image-outline', style: { color: 'var(--accent)' } })}
            Hình ảnh nhận diện thương hiệu (Logo & Favicon)
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
            {/* Synchronized Logo Item Card */}
            <div style={{
              background: 'rgba(11, 15, 26, 0.65)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', overflow: 'hidden' }}>
                <div style={{
                  width: '120px', height: '54px', borderRadius: '10px',
                  background: 'rgba(3, 7, 18, 0.8)',
                  border: logoUrl ? '1px solid var(--accent)' : '1px dashed rgba(255, 255, 255, 0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden', flexShrink: 0, padding: '4px',
                  boxShadow: logoUrl ? '0 0 12px rgba(134, 59, 255, 0.15)' : 'none',
                  transition: 'all 0.2s ease'
                }}>
                  {logoUrl ? (
                    <img src={logoUrl} alt="logo" style={{ maxWidth: '100%', maxHeight: '44px', objectFit: 'contain' }} />
                  ) : (
                    <span style={{ fontSize: '1.3rem', color: 'var(--text-muted)' }}>
                      {React.createElement('ion-icon', { name: 'image-outline' })}
                    </span>
                  )}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.92rem', color: '#fff' }}>Logo Hệ thống</div>
                  <div style={{ fontSize: '0.78rem', color: logoUrl ? '#10b981' : 'var(--text-muted)', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: logoUrl ? '#10b981' : '#64748b' }} />
                    {logoUrl ? 'Đã tải logo' : 'Chưa có logo'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                <label className="btn btn-outline btn-xs" style={{  padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  {React.createElement('ion-icon', { name: 'cloud-upload-outline' })} {logoUrl ? 'Đổi logo' : 'Tải lên'}
                  <input type="file" accept="image/*" hidden onChange={e => uploadAsset('logo', e)} />
                </label>
                {logoUrl && (
                  <button className="btn btn-danger-ghost btn-xs" onClick={() => deleteAsset('logo')} title="Xóa logo" style={{ padding: '0.4rem 0.6rem' }}>
                    {React.createElement('ion-icon', { name: 'trash-outline' })}
                  </button>
                )}
              </div>
            </div>

            {/* Synchronized Favicon Item Card */}
            <div style={{
              background: 'rgba(11, 15, 26, 0.65)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', overflow: 'hidden' }}>
                <div style={{
                  width: '120px', height: '54px', borderRadius: '10px',
                  background: 'rgba(3, 7, 18, 0.8)',
                  border: faviconUrl ? '1px solid #3b82f6' : '1px dashed rgba(255, 255, 255, 0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden', flexShrink: 0, padding: '4px',
                  boxShadow: faviconUrl ? '0 0 12px rgba(59, 130, 246, 0.15)' : 'none',
                  transition: 'all 0.2s ease'
                }}>
                  {faviconUrl ? (
                    <img src={faviconUrl} alt="favicon" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
                  ) : (
                    <span style={{ fontSize: '1.3rem', color: 'var(--text-muted)' }}>
                      {React.createElement('ion-icon', { name: 'globe-outline' })}
                    </span>
                  )}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.92rem', color: '#fff' }}>Favicon Biểu tượng</div>
                  <div style={{ fontSize: '0.78rem', color: faviconUrl ? '#3b82f6' : 'var(--text-muted)', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: faviconUrl ? '#3b82f6' : '#64748b' }} />
                    {faviconUrl ? 'Đã tải favicon' : 'Chưa có favicon'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                <label className="btn btn-outline btn-xs" style={{  padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  {React.createElement('ion-icon', { name: 'cloud-upload-outline' })} {faviconUrl ? 'Đổi favicon' : 'Tải lên'}
                  <input type="file" accept="image/*,.ico" hidden onChange={e => uploadAsset('favicon', e)} />
                </label>
                {faviconUrl && (
                  <button className="btn btn-danger-ghost btn-xs" onClick={() => deleteAsset('favicon')} title="Xóa favicon" style={{ padding: '0.4rem 0.6rem' }}>
                    {React.createElement('ion-icon', { name: 'trash-outline' })}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          
            <div className="folder-list-scroll" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', width: '100%', padding: '1rem 0 0.5rem 0', position: 'sticky', top: 0, zIndex: 20, background: 'var(--card-bg)', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '0.5rem' }}>
              <DroppableFolder id="all" isSortable={false} isActive={selectedFolderId === 'all'} onClick={() => setSelectedFolderId('all')} name="Tất cả" />
              <DroppableFolder id="unassigned" isSortable={false} isActive={selectedFolderId === 'unassigned'} onClick={() => setSelectedFolderId('unassigned')} name="Chưa phân loại" />
              <SortableContext items={folders.map(f => 'folder-' + f.id)} strategy={rectSortingStrategy}>
                  {folders.map(folder => (
                    <DroppableFolder 
                      key={folder.id} 
                      id={folder.id.toString()}
                      isSortable={true}
                      isActive={selectedFolderId === folder.id}
                      onClick={() => setSelectedFolderId(folder.id)}
                      name={folder.name}
                      onRename={() => renameFolder(folder.id, folder.name)}
                      onDelete={() => deleteFolder(folder.id)}
                    />
                  ))}
                </SortableContext>
              <button className="btn btn-sm btn-outline" onClick={createFolder} style={{ whiteSpace: 'nowrap', borderStyle: 'dashed', flexShrink: 0 }}>+ Thư mục mới</button>
            </div>
          <div className="card-header" style={{ flexWrap: 'wrap', gap: '0.75rem', paddingTop: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h3>Kho dữ liệu ({files.length})</h3>
              {files.length > 0 && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem',  fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', userSelect: 'none' }}>
                  <input
                    type="checkbox"
                    checked={files.length > 0 && selectedFileIds.length === files.length}
                    onChange={toggleSelectAll}
                  />
                  Chọn tất cả
                </label>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              {selectedFileIds.length > 0 && (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-danger-ghost btn-sm" onClick={bulkDelete}>
                    {React.createElement('ion-icon', { name: 'trash-outline' })} Xóa ({selectedFileIds.length})
                  </button>
                  <CustomSelect 
  value={""} 
  placeholder="Chuyển tới..." 
  onChange={(val: string) => { if (val) moveFiles(val === 'null' ? null : Number(val)); }} 
  options={[
    { type: 'option', value: 'null', label: 'Chưa phân loại' },
    ...folders.map(f => ({ type: 'option', value: f.id, label: f.name }))
  ]} 
/>
                </div>
              )}
              
              <button className="btn btn-outline btn-sm" onClick={() => syncFiles()} disabled={!!syncStatus}>
                {React.createElement('ion-icon', { name: syncStatus ? 'sync' : 'sync-outline', className: syncStatus ? 'spin' : '' })} {syncStatus || 'Đồng bộ'}
              </button>
              
              <label className={`btn btn-primary btn-sm ${fileUploading ? 'disabled' : ''}`}>
                {fileUploading ? (
                  <>{React.createElement('ion-icon', { name: 'hourglass-outline' })} {uploadProgress}</>
                ) : (
                  <>{React.createElement('ion-icon', { name: 'cloud-upload-outline' })} Tải lên</>
                )}
                <input type="file" accept="audio/*" multiple hidden onChange={upload} disabled={fileUploading} />
              </label>
            </div>
          </div>
                    <div className="file-list">
            {files.length === 0 && <div className="empty-state">Chưa có tệp nào. Hãy tải lên!</div>}
            
            {selectedFolderId !== 'all' ? (() => {
                  const filtered = files.filter(f => selectedFolderId === 'unassigned' ? !f.folderId : f.folderId === selectedFolderId);
                  return (
                    <SortableContext items={filtered.map(f => 'file-' + f.id)} strategy={rectSortingStrategy}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.5rem' }}>
                        {filtered.map(renderFile)}
                      </div>
                    </SortableContext>
                  );
                })() : (
              <>
                {folders.map(folder => {
                  const folderFiles = files.filter(f => f.folderId === folder.id);
                  if (folderFiles.length === 0) return null;
                  const isCollapsed = collapsedFolders[folder.id.toString()];
                  return (
                    <div key={folder.id} style={{ marginBottom: '1rem', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                      <div 
                        
                        style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem',  background: 'rgba(255,255,255,0.02)', borderBottom: isCollapsed ? 'none' : '1px solid var(--border)' }}
                      >
                        
                        {React.createElement('ion-icon', { name: 'folder-outline', style: { color: 'var(--accent)' } })}
                        <strong style={{ flex: 1, color: 'var(--text)' }}>{folder.name}</strong>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{folderFiles.length} tệp</span>
                      </div>
                      <SortableContext items={folderFiles.map(f => 'file-' + f.id)} strategy={rectSortingStrategy}>
                        <div style={{ padding: '0.75rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.5rem' }}>
                          {folderFiles.map(renderFile)}
                        </div>
                      </SortableContext>
                    </div>
                  );
                })}
                
                {/* Unassigned files */}
                {files.filter(f => !f.folderId).length > 0 && (() => {
                  const unassignedFiles = files.filter(f => !f.folderId);
                  const isCollapsed = collapsedFolders['unassigned'];
                  return (
                    <div style={{ marginBottom: '1rem', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                      <div 
                        
                        style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem',  background: 'rgba(255,255,255,0.02)', borderBottom: isCollapsed ? 'none' : '1px solid var(--border)' }}
                      >
                        
                        {React.createElement('ion-icon', { name: 'folder-outline', style: { color: 'var(--text-muted)' } })}
                        <strong style={{ flex: 1, color: 'var(--text)' }}>Chưa phân loại</strong>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{unassignedFiles.length} tệp</span>
                      </div>
                      <SortableContext items={unassignedFiles.map(f => 'file-' + f.id)} strategy={rectSortingStrategy}>
                        <div style={{ padding: '0.75rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.5rem' }}>
                          {unassignedFiles.map(renderFile)}
                        </div>
                      </SortableContext>
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        </div>
            </div>
      </DndContext>
    );
  };
