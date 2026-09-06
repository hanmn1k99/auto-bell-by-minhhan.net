const fs = require('fs');
let code = fs.readFileSync('frontend/src/AdminPage.tsx', 'utf8');

const insertState = `  const [files, setFiles] = useState<AudioFile[]>([]);
  const [folders, setFolders] = useState<any[]>([]);`;
code = code.replace(/const \[files, setFiles\] = useState<AudioFile\[\]>\(\[\]\);/, insertState);

const insertFetch = `  const fetchFiles = () => api.get('/api/files').then(r => setFiles(Array.isArray(r.data) ? r.data : []));
  const fetchFolders = () => api.get('/api/files/folders').then(r => setFolders(Array.isArray(r.data) ? r.data : []));`;
code = code.replace(/const fetchFiles = \(\) => api\.get\('\/api\/files'\)\.then\(r => setFiles\(Array\.isArray\(r\.data\) \? r\.data : \[\]\)\);/, insertFetch);

const insertInitialFetch = `    fetchFiles();
    fetchFolders();`;
code = code.replace(/fetchFiles\(\);/, insertInitialFetch);

const insertCtx = `fetchDevices, fetchFiles, fetchFolders, folders, API_URL`;
code = code.replace(/fetchDevices, fetchFiles, API_URL/, insertCtx);

fs.writeFileSync('frontend/src/AdminPage.tsx', code, 'utf8');