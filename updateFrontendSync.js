const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/admin/Files.tsx', 'utf8');

const syncFilesRegex = /const syncFiles = async \(silent\?:\s*boolean\) => \{[\s\S]*?\}\s*catch\s*\(err:\s*any\)\s*\{\s*notify[\s\S]*?\}\s*\};\s*/;
const newSyncFiles = `const [syncStatus, setSyncStatus] = useState<string | null>(null);

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
                   notify(\`Đồng bộ xong! Đã thêm \${stRes.data.addedCount} tệp, xóa \${stRes.data.deletedCount} tệp.\`);
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
             notify(\`Đồng bộ xong! Đã nạp \${addedCount} tệp mới, xóa \${deletedCount} tệp không còn trên máy chủ.\`);
           }
           setSelectedFileIds([]); fetchFiles(); fetchFolders();
        }
      } catch (err: any) {
        notify(err.response?.data?.error || 'Lỗi đồng bộ tệp', 'err');
      }
    };
    `;
    
code = code.replace(syncFilesRegex, newSyncFiles);

const syncButtonRegex = /<button className="btn btn-outline" onClick=\{\(\) => syncFiles\(\)\} style=\{\{ display: 'flex', alignItems: 'center', gap: '0\.4rem' \}\}>\s*\{React\.createElement\('ion-icon', \{ name: 'sync-outline' \}\)\} Đồng bộ file\s*<\/button>/;
const newSyncButton = `<button className="btn btn-outline" onClick={() => syncFiles()} disabled={!!syncStatus} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  {React.createElement('ion-icon', { name: syncStatus ? 'sync' : 'sync-outline', className: syncStatus ? 'spin' : '' })} {syncStatus || 'Đồng bộ file'}
                </button>`;

code = code.replace(syncButtonRegex, newSyncButton);

fs.writeFileSync('frontend/src/components/admin/Files.tsx', code, 'utf8');