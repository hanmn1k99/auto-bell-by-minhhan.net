
import React, { useContext, useState, useEffect, useRef } from 'react';
import { AdminContext } from './AdminContext';
import { SortableFile } from './SortableFile';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from "@dnd-kit/utilities";

const SortableFolderTab = ({ id, isActive, onClick, name }: any) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: 'folder-' + id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  
  return (
    <button
      ref={setNodeRef}
      style={{
        ...style,
        padding: '0.45rem 1rem',
        borderRadius: '99px',
        background: isActive ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
        color: isActive ? '#fff' : 'var(--text-muted)',
        border: '1px solid ' + (isActive ? 'var(--accent)' : 'var(--border)'),
        cursor: 'default',
        touchAction: 'none',
        userSelect: 'none',
        whiteSpace: 'nowrap',
        flexShrink: 0
      }}
      onClick={onClick}
      {...attributes}
      {...listeners}
    >
      {name}
    </button>
  );
};

const SortableFolderBlock = ({ id, folder, folderFiles, guessIcon, playManual, queueManual }: any) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: 'folder-block-' + id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, position: 'relative' as any, zIndex: isDragging ? 99 : 1 };
  
  return (
    <div ref={setNodeRef} style={{ ...style, marginBottom: '1rem', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
      <div {...attributes} {...listeners} style={{ cursor: 'grab', touchAction: 'none', userSelect: 'none', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)' }}>
        {React.createElement('ion-icon', { name: 'folder-outline', style: { color: 'var(--accent)' } })}
        <strong style={{ flex: 1, color: 'var(--text)' }}>{folder.name}</strong>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{folderFiles.length} tệp</span>
        {React.createElement('ion-icon', { name: 'reorder-two-outline', style: { color: 'var(--text-muted)', fontSize: '1.2rem', marginLeft: '0.5rem' } })}
      </div>
      <SortableContext items={folderFiles.map((f: any) => 'file-' + f.id)} strategy={rectSortingStrategy}>
      <div style={{ padding: '0.75rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.5rem' }}>
        {folderFiles.map((f: any) => (
          <SortableFile id={'file-' + f.id} key={f.id}>
            <div className="file-item" style={{ 
              padding: '0.5rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', 
              borderRadius: '8px', border: '1px solid var(--border)', background: 'rgba(255, 255, 255, 0.03)', marginBottom: 0
            }}>
              <span className="file-icon" style={{ flexShrink: 0, display: 'flex', alignItems: 'center', color: 'var(--accent)' }}>
                {React.createElement('ion-icon', { name: guessIcon(f.name) })}
              </span>
              <div style={{ minWidth: 0, flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.9rem', fontWeight: 500 }} title={f.name}>{f.name}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                <button className="btn btn-xs" onPointerDown={(e) => e.stopPropagation()} onClick={() => playManual('file', f.id)} style={{ background: 'var(--accent)', color: '#fff', border: 'none', padding: '0.25rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }} title="Phát">
                  {React.createElement('ion-icon', { name: 'play' })} Phát
                </button>
                <button className="btn btn-xs btn-outline" onPointerDown={(e) => e.stopPropagation()} onClick={() => queueManual('file', f.id)} style={{ padding: '0.25rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }} title="Thêm">
                  {React.createElement('ion-icon', { name: 'add' })} Thêm
                </button>
              </div>
            </div>
          </SortableFile>
        ))}
      </div>
      </SortableContext>
    </div>
  );
};

export const Dashboard = () => {
  const ctx = useContext(AdminContext);
  // We will manually fix the destructuring later, or use ctx.foo in the code.
  // Actually, replacing all undefined variables with ctx.varName is hard.
  // Instead, we will destructure everything we can think of.
  const { tab, setTab, files, setFiles, schedules, setSchedules, bells, setBells, departments, setDepartments, periods, setPeriods, devices, setDevices, usersList, setUsersList, msg, setMsg, logoUrl, setLogoUrl, faviconUrl, setFaviconUrl, volume, setVolume, globalFadeInDuration, setGlobalFadeInDuration, orgMode, setOrgMode, fileUploading, setFileUploading, uploadProgress, setUploadProgress, selectedFileIds, setSelectedFileIds, addFileId, setAddFileId, newSchName, setNewSchName, selectedSch, setSelectedSch, pForm, setPForm, editingPeriod, setEditingPeriod, selectedPeriods, setSelectedPeriods, showBulkEditPeriod, setShowBulkEditPeriod, bulkEditPeriodForm, setBulkEditPeriodForm, bulkDep, setBulkDep, bulkAudio, setBulkAudio, bulkCount, setBulkCount, bulkStart, setBulkStart, bulkDuration, setBulkDuration, bulkBreak, setBulkBreak, bulkLongBreaks, setBulkLongBreaks, bulkDays, setBulkDays, bulkBaseName, setBulkBaseName, bulkPreview, setBulkPreview, depName, setDepName, depColor, setDepColor, depSoundCardId, setDepSoundCardId, depEditId, setDepEditId, availableSoundCards, setAvailableSoundCards, isSimulatorMode, setIsSimulatorMode, ytUrl, setYtUrl, ytPlayingVideo, setYtPlayingVideo, ytPlayingTitle, setYtPlayingTitle, ytCCOn, setYtCCOn, ytVideoPaused, setYtVideoPaused, ytSearchResults, setYtSearchResults, ytSearching, setYtSearching, inlinePreviewId, setInlinePreviewId, dialog, setDialog, playingPreviewSrc, setPlayingPreviewSrc, nowPlaying, setNowPlaying, bellPlaying, setBellPlaying, sidebarOpen, setSidebarOpen, mediaDuration, setMediaDuration, api, notify, userRole, curProfile, DAYS, ALL_WEEKDAYS, ALL_DAYS, systemMenuOpen, setSystemMenuOpen, systemHovered, setSystemHovered, showUserForm, setShowUserForm, newUser, setNewUser, systemSubTab, setSystemSubTab, playlists, setPlaylists, playManual, queueManual, fetchDepartments, customConfirm, getSoundCardName, triggerLiveTestBell, PREDEFINED_COLORS, guessIcon, getSoundCardIcon, customPrompt, updateDevice, deleteDevice, fetchDevices, fetchFiles, folders, setFolders, fetchFolders, API_URL, MiniPlayer, fetchPeriods, DayPicker, MiniPlayerProgress, handleVolumeChange, handleFadeInChange, fetchSchedules, ORG_PROFILES, changeOrgMode, fetchUsers, resumeYtVideoOnPlayer, pauseYtVideoOnPlayer, stopYtVideoOnPlayer, handleYtInputKeyDown, fastPlayYt } = ctx;

    const [selectedFolderId, setSelectedFolderId] = useState<number | 'all' | 'unassigned'>('all');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

      const handleDragEndDnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    // FOLDERS
    if (activeId.startsWith('folder-') && overId.startsWith('folder-')) {
      const isBlock = activeId.startsWith('folder-block-');
      const prefix = isBlock ? 'folder-block-' : 'folder-';
      
      const oldIndex = folders.findIndex((f: any) => prefix + f.id === activeId);
      const newIndex = folders.findIndex((f: any) => prefix + f.id === overId);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newFolders = arrayMove(folders, oldIndex, newIndex);
        setFolders(newFolders);
        try {
          const orderedIds = newFolders.map((f: any) => f.id);
          await api.put(`/api/files/folders/reorder`, { orderedIds });
        } catch (e) {
          fetchFolders();
        }
      }
      return;
    }

    // FILES
    if (activeId.startsWith('file-') && overId.startsWith('file-')) {
      const oldIndex = files.findIndex((f: any) => 'file-' + f.id === activeId);
      const newIndex = files.findIndex((f: any) => 'file-' + f.id === overId);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newFiles = arrayMove(files, oldIndex, newIndex);
        setFiles(newFiles);
        try {
          const orderedIds = newFiles.map((f: any) => f.id);
          await api.put(`/api/files/reorder`, { orderedIds });
        } catch (e) {
          fetchFiles();
        }
      }
      return;
    }
  };

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Necessary to allow dropping
  };

  const handleDrop = async (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const newPlaylists = [...playlists];
    const [movedItem] = newPlaylists.splice(draggedIndex, 1);
    newPlaylists.splice(targetIndex, 0, movedItem);

    setPlaylists(newPlaylists);
    setDraggedIndex(null);

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
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.5rem', marginBottom: '1.5rem' }}>
              {playlists.map((p: any, index: number) => {
                const s = schedules.find((sch: any) => sch.playlistId === p.id);
                return (
                  <div 
                    className="file-item" 
                    key={p.id}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, index)}
                    style={{ 
                      opacity: draggedIndex === index ? 0.5 : 1,
                      padding: '0.5rem 0.75rem',
                      display: 'flex', 
                      alignItems: 'center',
                      gap: '0.5rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'rgba(255, 255, 255, 0.03)',
                      marginBottom: 0
                    }}
                  >
                    <span className="file-icon" style={{ flexShrink: 0, display: 'flex', alignItems: 'center', color: '#10b981' }}>
                      {React.createElement('ion-icon', { name: 'list-outline' })}
                    </span>
                    
                    <div style={{ minWidth: 0, flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.9rem', fontWeight: 500 }} title={p.name}>{p.name}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', flexShrink: 0 }}>({p.items?.length ?? 0} bài)</span>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                      <button className="btn btn-xs" onClick={() => playManual('playlist', p.id)} style={{ background: 'var(--accent)', color: '#fff', border: 'none', padding: '0.25rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        {React.createElement('ion-icon', { name: 'play' })} Phát
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

                                    <h3 style={{ marginTop: '1.5rem' }}>Phát Tập Âm Thanh</h3>
            
            <div className="folder-list-scroll" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', width: '100%', marginBottom: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
              <button 
                onClick={() => setSelectedFolderId('all')}
                style={{
                  padding: '0.45rem 1rem',
                  borderRadius: '99px',
                  background: selectedFolderId === 'all' ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                  color: selectedFolderId === 'all' ? '#fff' : 'var(--text-muted)',
                  border: '1px solid ' + (selectedFolderId === 'all' ? 'var(--accent)' : 'var(--border)'),
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}
              >
                Tất cả
              </button>
              <button 
                onClick={() => setSelectedFolderId('unassigned')}
                style={{
                  padding: '0.45rem 1rem',
                  borderRadius: '99px',
                  background: selectedFolderId === 'unassigned' ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                  color: selectedFolderId === 'unassigned' ? '#fff' : 'var(--text-muted)',
                  border: '1px solid ' + (selectedFolderId === 'unassigned' ? 'var(--accent)' : 'var(--border)'),
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}
              >
                Chưa phân loại
              </button>
              {folders.map((folder: any) => (
                <button 
                  key={folder.id}
                  onClick={() => setSelectedFolderId(folder.id)}
                  style={{
                    padding: '0.45rem 1rem',
                    borderRadius: '99px',
                    background: selectedFolderId === folder.id ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                    color: selectedFolderId === folder.id ? '#fff' : 'var(--text-muted)',
                    border: '1px solid ' + (selectedFolderId === folder.id ? 'var(--accent)' : 'var(--border)'),
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    flexShrink: 0
                  }}
                >
                  {folder.name}
                </button>
              ))}
            </div>

            <div className="file-list">
              {files.length === 0 && <div className="empty-state">Chưa có tệp nào.</div>}
              
              {selectedFolderId !== 'all' ? (() => {
                const filtered = files.filter((f: any) => selectedFolderId === 'unassigned' ? !f.folderId : f.folderId === selectedFolderId);
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.5rem' }}>
                    <SortableContext items={filtered.map((f: any) => 'file-' + f.id)} strategy={rectSortingStrategy}>
                    {filtered.map((f: any) => (
                      <SortableFile id={'file-' + f.id} key={f.id}>
                        <div className="file-item" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: '8px', marginBottom: 0 }}>
                          <div style={{ fontSize: '1.25rem', color: 'var(--text-muted)' }}>
                            {React.createElement('ion-icon', { name: guessIcon(f.name) })}
                          </div>
                          <div className="file-name" style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={f.name}>{f.name}</div>
                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                            <button className="btn btn-icon" onClick={() => playManual('file', f.id)} style={{ color: 'var(--accent)' }} title="Phát">
                              {React.createElement('ion-icon', { name: 'play' })}
                            </button>
                            <button className="btn btn-icon" onClick={() => queueManual('file', f.id)} style={{ color: '#10b981' }} title="Thêm vào hàng đợi">
                              {React.createElement('ion-icon', { name: 'add' })}
                            </button>
                          </div>
                        </div>
                      </SortableFile>
                    ))}
                    </SortableContext>
                  </div>
                );
              })() : (
                <>
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndDnd}>
                    <SortableContext items={folders.map((f: any) => 'folder-block-' + f.id)} strategy={rectSortingStrategy}>
                      {folders.map((folder: any) => {
                        const folderFiles = files.filter((f: any) => f.folderId === folder.id);
                        if (folderFiles.length === 0) return null;
                        return (
                          <SortableFolderBlock 
                            key={folder.id} 
                            id={folder.id} 
                            folder={folder} 
                            folderFiles={folderFiles} 
                            guessIcon={guessIcon} 
                            playManual={playManual} 
                            queueManual={queueManual} 
                          />
                        );
                      })}
                    </SortableContext>
                  </DndContext>
                  {files.filter((f: any) => !f.folderId).length > 0 && (() => {
                    const unassignedFiles = files.filter((f: any) => !f.folderId);
                    return (
                      <div style={{ marginBottom: '1rem', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                        <div style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)' }}>
                          {React.createElement('ion-icon', { name: 'folder-outline', style: { color: 'var(--text-muted)' } })}
                          <strong style={{ flex: 1, color: 'var(--text)' }}>Chưa phân loại</strong>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{unassignedFiles.length} tệp</span>
                        </div>
                        <div style={{ padding: '0.75rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.5rem' }}>
                          <SortableContext items={unassignedFiles.map((f: any) => 'file-' + f.id)} strategy={rectSortingStrategy}>
                          {unassignedFiles.map((f: any) => (
                            <SortableFile id={'file-' + f.id} key={f.id}>
                              <div className="file-item" style={{ background: 'var(--bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: '8px', marginBottom: 0 }}>
                                <div style={{ fontSize: '1.25rem', color: 'var(--text-muted)' }}>
                                  {React.createElement('ion-icon', { name: guessIcon(f.name) })}
                                </div>
                                <div className="file-name" style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={f.name}>{f.name}</div>
                                <div style={{ display: 'flex', gap: '0.25rem' }}>
                                  <button className="btn btn-icon" onClick={() => playManual('file', f.id)} style={{ color: 'var(--accent)' }} title="Phát">
                                    {React.createElement('ion-icon', { name: 'play' })}
                                  </button>
                                  <button className="btn btn-icon" onClick={() => queueManual('file', f.id)} style={{ color: '#10b981' }} title="Thêm vào hàng đợi">
                                    {React.createElement('ion-icon', { name: 'add' })}
                                  </button>
                                </div>
                              </div>
                            </SortableFile>
                          ))}
                          </SortableContext>
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  
  );
};
  