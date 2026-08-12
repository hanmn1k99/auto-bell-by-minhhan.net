const fs = require('fs');
let c = fs.readFileSync('frontend/src/AdminPage.tsx', 'utf8');

const targetString = `  const logout = () => { 
    sessionStorage.removeItem('token'); 
    localStorage.removeItem('token');
    localStorage.removeItem('rememberMe');
    navigate('/login'); 
  };



  // ── Dashboard ───────────────────────
        await api.post(\`/api/admin/queue-file/\${id}\`);`;

const replacementString = `  const logout = () => { 
    sessionStorage.removeItem('token'); 
    localStorage.removeItem('token');
    localStorage.removeItem('rememberMe');
    navigate('/login'); 
  };

  const handleVolumeChange = async (val: number) => {
    setVolume(val);
    socket.emit('SET_VOLUME', val);
    try { await api.post('/api/admin/volume', { volume: val }); } catch {}
  };

  const handleFadeInChange = (val: number) => {
    const safeVal = Math.max(0, val);
    setGlobalFadeInDuration(safeVal);
    socket.emit('SET_FADE_IN', safeVal);
  };

  const playManual = async (type: 'file' | 'playlist', id: number) => {
    try {
      if (type === 'file') {
        await api.post(\`/api/admin/play-file/\${id}\`);
      } else if (type === 'playlist') {
        await api.post(\`/api/admin/play-playlist/\${id}\`);
      }
    } catch {
      notify('Lỗi phát thủ công', 'err');
    }
  };

  const queueManual = async (type: 'file' | 'playlist', id: number) => {
    try {
      if (type === 'file') {
        await api.post(\`/api/admin/queue-file/\${id}\`);`;

c = c.replace(targetString, replacementString);
fs.writeFileSync('frontend/src/AdminPage.tsx', c);
