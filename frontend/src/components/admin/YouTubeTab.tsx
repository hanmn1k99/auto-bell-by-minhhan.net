
import React, { useContext, useState, useEffect, useRef } from 'react';
import { AdminContext } from './AdminContext';

export const YouTubeTab = () => {
  const ctx = useContext(AdminContext);
  // We will manually fix the destructuring later, or use ctx.foo in the code.
  // Actually, replacing all undefined variables with ctx.varName is hard.
  // Instead, we will destructure everything we can think of.
  const { tab, setTab, files, setFiles, schedules, setSchedules, bells, setBells, departments, setDepartments, periods, setPeriods, devices, setDevices, usersList, setUsersList, msg, setMsg, logoUrl, setLogoUrl, faviconUrl, setFaviconUrl, volume, setVolume, globalFadeInDuration, setGlobalFadeInDuration, orgMode, setOrgMode, fileUploading, setFileUploading, uploadProgress, setUploadProgress, selectedFileIds, setSelectedFileIds, addFileId, setAddFileId, newSchName, setNewSchName, selectedSch, setSelectedSch, pForm, setPForm, editingPeriod, setEditingPeriod, selectedPeriods, setSelectedPeriods, showBulkEditPeriod, setShowBulkEditPeriod, bulkEditPeriodForm, setBulkEditPeriodForm, bulkDep, setBulkDep, bulkAudio, setBulkAudio, bulkCount, setBulkCount, bulkStart, setBulkStart, bulkDuration, setBulkDuration, bulkBreak, setBulkBreak, bulkLongBreaks, setBulkLongBreaks, bulkDays, setBulkDays, bulkBaseName, setBulkBaseName, bulkPreview, setBulkPreview, depName, setDepName, depColor, setDepColor, depSoundCardId, setDepSoundCardId, depEditId, setDepEditId, availableSoundCards, setAvailableSoundCards, isSimulatorMode, setIsSimulatorMode, ytUrl, setYtUrl, ytPlayingVideo, setYtPlayingVideo, ytPlayingTitle, setYtPlayingTitle, ytCCOn, setYtCCOn, ytVideoPaused, setYtVideoPaused, ytSearchResults, setYtSearchResults, ytSearching, setYtSearching, inlinePreviewId, setInlinePreviewId, dialog, setDialog, playingPreviewSrc, setPlayingPreviewSrc, nowPlaying, setNowPlaying, bellPlaying, setBellPlaying, sidebarOpen, setSidebarOpen, mediaDuration, setMediaDuration, api, notify, userRole, curProfile, DAYS, ALL_WEEKDAYS, ALL_DAYS, systemMenuOpen, setSystemMenuOpen, systemHovered, setSystemHovered, showUserForm, setShowUserForm, newUser, setNewUser, systemSubTab, setSystemSubTab, playlists, playManual, queueManual, fetchDepartments, customConfirm, getSoundCardName, triggerLiveTestBell, PREDEFINED_COLORS, guessIcon, getSoundCardIcon, customPrompt, updateDevice, deleteDevice, fetchDevices, fetchFiles, API_URL, MiniPlayer, fetchPeriods, DayPicker, MiniPlayerProgress, handleVolumeChange, handleFadeInChange, fetchSchedules, ORG_PROFILES, changeOrgMode, fetchUsers, resumeYtVideoOnPlayer, pauseYtVideoOnPlayer, stopYtVideoOnPlayer, handleYtInputKeyDown, fastPlayYt } = ctx;

  
  const [ytSuggests, setYtSuggests] = useState<string[]>([]);
  const [showYtSuggests, setShowYtSuggests] = useState(false);
  const suggestTimeout = useRef<any>(null);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  useEffect(() => {
    try {
      const hist = JSON.parse(localStorage.getItem("ytSearchHistory") || "[]");
      if (Array.isArray(hist)) setSearchHistory(hist);
    } catch (e) {}
  }, []);

  
  const executeSearch = async (query: string) => {
    if (!query.trim()) return;
    setYtUrl(query);
    setYtSearching(true);
    const newHist = [query.trim(), ...searchHistory.filter(h => h !== query.trim())].slice(0, 10);
    setSearchHistory(newHist);
    localStorage.setItem("ytSearchHistory", JSON.stringify(newHist));
    try {
      const res = await api.post("/api/youtube/search", { q: query.trim() });
      setYtSearchResults(res.data);
    } catch (err: any) {
      notify(err.response?.data?.error || "Lỗi tìm kiếm YouTube", "err");
    } finally {
      setYtSearching(false);
    }
  };

  const fetchSuggestions = async (q: string) => {
    if (!q.trim() || q.includes("youtube.com") || q.includes("youtu.be")) {
      setYtSuggests([]);
      return;
    }
    try {
      const res = await api.get(`/api/youtube/suggest?q=${encodeURIComponent(q)}`);
      setYtSuggests(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const onYtUrlChange = (val: string) => {
    setYtUrl(val);
    setShowYtSuggests(true);
    if (suggestTimeout.current) clearTimeout(suggestTimeout.current);
    suggestTimeout.current = setTimeout(() => {
      fetchSuggestions(val);
    }, 300);
  };

  return (
    <div className="admin-section">
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.65rem', color: '#fff' }}>
          {React.createElement('ion-icon', { name: 'logo-youtube', style: { color: 'var(--accent)', fontSize: '1.6rem' } })}
          YouTube
        </h2>
        <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
          Tìm kiếm bài hát hoặc dán liên kết video
        </p>
      </div>

      {ytPlayingVideo && (
        <div className="card mb-4" style={{
          padding: '1.25rem 1.5rem', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--border)',
          borderRadius: '16px', display: 'flex', flexWrap: 'wrap', gap: '1.2rem', justifyContent: 'space-between', alignItems: 'center'
        }}>
          {/* Cột trái: Trạng thái & Tên Video */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flex: '1 1 auto', minWidth: '250px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: ytVideoPaused ? '#f59e0b' : '#10b981', boxShadow: `0 0 10px ${ytVideoPaused ? '#f59e0b' : '#10b981'}` }} />
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                {ytVideoPaused ? 'TẠM DỪNG' : 'ĐANG PHÁT TRÊN PLAYER'}
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff', marginTop: '2px',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '300px'
               }} title={ytPlayingTitle || 'Video YouTube'}>
                {ytPlayingTitle || 'Video YouTube'}
              </div>
            </div>
          </div>

          {/* Cột phải: Control Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {ytVideoPaused ? (
              <button className="btn btn-outline btn-sm" onClick={resumeYtVideoOnPlayer} title="Phát tiếp" style={{ width: '36px', height: '36px', padding: 0, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                {React.createElement('ion-icon', { name: 'play', style: { fontSize: '1.2rem' } })}
              </button>
            ) : (
              <button className="btn btn-outline btn-sm" onClick={pauseYtVideoOnPlayer} title="Tạm dừng" style={{ width: '36px', height: '36px', padding: 0, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                {React.createElement('ion-icon', { name: 'pause', style: { fontSize: '1.2rem' } })}
              </button>
            )}

            <div style={{ width: '1px', height: '24px', background: 'var(--border)', margin: '0 0.25rem' }}></div>

            <button 
              className="btn btn-outline btn-sm" 
              title="Bật/Tắt Phụ đề" 
              onClick={() => api.post('/api/youtube/command', { command: 'toggleCC' })}
              style={{
                background: ytCCOn ? 'var(--primary)' : 'transparent',
                borderColor: ytCCOn ? 'var(--primary)' : 'var(--border)',
                color: ytCCOn ? '#fff' : 'var(--text)',
                fontWeight: 'bold',
                width: '36px',
                height: '36px',
                padding: 0,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              CC
            </button>

            <div style={{ width: '1px', height: '24px', background: 'var(--border)', margin: '0 0.25rem' }}></div>

            <button className="btn btn-outline btn-sm" onClick={stopYtVideoOnPlayer} style={{ borderColor: 'rgba(239,68,68,0.4)', color: '#ef4444', width: '36px', height: '36px', padding: 0, display: 'flex', justifyContent: 'center', alignItems: 'center' }} title="Dừng & Thoát">
              {React.createElement('ion-icon', { name: 'square', style: { fontSize: '1.1rem' } })}
            </button>
          </div>
        </div>
      )}

                  <div className="card mb-4" style={{ padding: '1.5rem', overflow: 'visible' }}>
        <h3 style={{ marginTop: 0, marginBottom: '1.25rem', fontSize: '1.05rem', color: '#fff' }}>Nhập tên bài hát hoặc liên kết</h3>
        
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '280px', position: 'relative' }}>
            <input 
              type="text" 
              className="input" 
              placeholder="Dán liên kết YouTube hoặc nhập tên bài hát (Bấm Enter)..."
              value={ytUrl}
              onChange={e => onYtUrlChange(e.target.value)}
              onFocus={() => setShowYtSuggests(true)}
              onBlur={() => setTimeout(() => setShowYtSuggests(false), 200)}
              onKeyDown={(e) => { if (e.key === "Enter") { setShowYtSuggests(false); executeSearch(ytUrl); } }}
              style={{ width: '100%', paddingLeft: '2.5rem', paddingRight: ytSearching ? '8rem' : '1rem' }}
            />
            <span style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '1.2rem', display: 'flex' }}>
              {React.createElement('ion-icon', { name: 'search-outline' })}
            </span>
            
            {showYtSuggests && ytSuggests.length > 0 && (
              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: "4px", background: "#1e293b", border: "1px solid var(--border)", borderRadius: "8px", zIndex: 50, overflow: "hidden", boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)" }}>
                {ytSuggests.map((sugg, i) => (
                  <div key={i} style={{ padding: "0.75rem 1rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem", color: "#fff", fontSize: "0.9rem", transition: "background 0.2s" }}
                    onMouseOver={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                    onMouseOut={e => e.currentTarget.style.background = "transparent"}
                    onMouseDown={(e) => { e.preventDefault(); setShowYtSuggests(false); executeSearch(sugg); }}
                  >
                    {React.createElement("ion-icon", { name: "search-outline", style: { color: "var(--text-muted)" } })}
                    {sugg}
                  </div>
                ))}
              </div>
            )}

            {ytSearching && (
              <span style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.78rem', color: 'var(--accent)', fontWeight: 600 }}>
                Đang xử lý...
              </span>
            )}
          </div>
          <button className="btn btn-primary" onClick={() => executeSearch(ytUrl)} disabled={ytSearching || !ytUrl.trim()}>
            Tìm kiếm
          </button>
        </div>

        
        {ytSearchResults.length === 0 && !ytSearching && searchHistory.length > 0 && (
          <div style={{ marginTop: "2rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h4 style={{ fontSize: "0.9rem", color: "var(--text-muted)", margin: 0, textTransform: "uppercase", letterSpacing: "0.5px" }}>Gợi ý</h4>
              <button className="btn btn-ghost btn-sm" style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", color: "var(--text-muted)" }} onClick={() => { setSearchHistory([]); localStorage.removeItem("ytSearchHistory"); }}>
                Xóa lịch sử
              </button>
            </div>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              {searchHistory.map((tag, i) => (
                <button key={i} className="btn btn-outline btn-sm" style={{ borderRadius: "20px", background: "rgba(255,255,255,0.03)" }}
                  onClick={() => { setShowYtSuggests(false); executeSearch(tag); }}
                >
                  {React.createElement("ion-icon", { name: "time-outline", style: { marginRight: "6px" } })}
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}


        {/* Search Results Grid */}
        {ytSearchResults.length > 0 && (
          <div style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
            {ytSearchResults.map((video, idx) => (
              <div 
                key={idx} 
                style={{ 
                  background: 'rgba(11, 15, 26, 0.7)', 
                  border: '1px solid var(--border)', 
                  borderRadius: '12px', 
                  overflow: 'hidden', 
                  cursor: 'pointer', 
                  transition: 'all 0.2s', 
                  display: 'flex', 
                  flexDirection: 'column',
                  gridColumn: inlinePreviewId === video.videoId ? '1 / -1' : undefined
                }} 
                onMouseOver={e => e.currentTarget.style.borderColor = 'var(--accent)'} 
                onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', background: '#000' }}>
                  {inlinePreviewId === video.videoId ? (
                    <iframe 
                      src={`https://www.youtube.com/embed/${video.videoId}?autoplay=1&controls=1&modestbranding=1&rel=0`} 
                      title="YouTube preview" 
                      frameBorder="0" 
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                      allowFullScreen
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                    />
                  ) : (
                    <div style={{ cursor: 'pointer', position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} onClick={() => setInlinePreviewId(video.videoId)}>
                      <img src={video.thumbnail} alt={String(video.title)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <span style={{ position: 'absolute', bottom: '6px', right: '6px', background: 'rgba(0,0,0,0.8)', color: '#fff', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>{video.formattedDuration}</span>
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.2)' }}>
                        <div style={{ width: '48px', height: '48px', background: 'rgba(0,0,0,0.7)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                          {React.createElement('ion-icon', { name: 'play', style: { fontSize: '1.5rem', marginLeft: '4px' } })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: '1.4' }}>
                    {String(video.title)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{video.views ? `${video.views.toLocaleString()} lượt xem` : ''}</span>
                  </div>
                  <div style={{ marginTop: 'auto', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        className="btn btn-sm btn-outline" 
                        style={{ flex: 1, padding: '0.4rem', fontSize: '0.75rem', justifyContent: 'center', borderColor: inlinePreviewId === video.videoId ? '#ef4444' : undefined, color: inlinePreviewId === video.videoId ? '#ef4444' : undefined }} 
                        onClick={(e) => { e.stopPropagation(); setInlinePreviewId(inlinePreviewId === video.videoId ? null : video.videoId); }}
                      >
                        {inlinePreviewId === video.videoId ? 'Đóng nghe thử' : 'Nghe thử'}
                      </button>

                    </div>
                    <button className="btn btn-primary btn-sm" style={{ width: '100%', padding: '0.4rem', fontSize: '0.75rem', justifyContent: 'center' }} onClick={(e) => { e.stopPropagation(); fastPlayYt(video); }}>
                      Phát
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  
  );
};
  