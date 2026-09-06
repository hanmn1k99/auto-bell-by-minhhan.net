const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/admin/Files.tsx', 'utf8');

const ctxAdd = `fetchDevices, fetchFiles, fetchFolders, folders, API_URL`;
code = code.replace(/fetchDevices, fetchFiles, API_URL/, ctxAdd);

// Remove local folders state
const stateToRemove = `    const [folders, setFolders] = useState<any[]>([]);`;
code = code.replace(stateToRemove, '');

const fetchToRemove = `    const fetchFolders = async () => {
      try {
        const res = await api.get('/api/files/folders');
        setFolders(res.data);
      } catch (err) {
        console.error('Failed to fetch folders', err);
      }
    };

    useEffect(() => {
      fetchFolders();
    }, []);`;
code = code.replace(fetchToRemove, '');

fs.writeFileSync('frontend/src/components/admin/Files.tsx', code, 'utf8');