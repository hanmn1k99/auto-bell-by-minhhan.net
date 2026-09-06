const fs = require('fs');
let code = fs.readFileSync('backend/src/routes/files.ts', 'utf8');

const syncStart = code.indexOf('// POST /api/files/sync');
const syncEnd = code.indexOf('// PUT /api/files/:id - rename audio file');
if (syncStart === -1 || syncEnd === -1) {
  console.log('Cannot find bounds');
  process.exit(1);
}

const before = code.substring(0, syncStart);
const after = code.substring(syncEnd);

const newSyncLogic = `// Background sync state
let globalSyncStatus = { isRunning: false, progress: '', addedCount: 0, deletedCount: 0, fixedCount: 0, error: '' };

// GET /api/files/sync/status - Check sync status
router.get('/sync/status', authenticateToken, (req: Request, res: Response) => {
  res.json(globalSyncStatus);
});

// POST /api/files/sync - sync files from disk to DB
router.post('/sync', authenticateToken, (req: Request, res: Response) => {
  if (globalSyncStatus.isRunning) {
    return res.json({ status: 'already_running', message: 'Đang có tiến trình đồng bộ chạy ngầm.' });
  }

  globalSyncStatus = { isRunning: true, progress: 'Đang chuẩn bị...', addedCount: 0, deletedCount: 0, fixedCount: 0, error: '' };
  res.json({ status: 'started', message: 'Bắt đầu đồng bộ ngầm.' });

  // Run in background
  (async () => {
    try {
      let addedCount = 0;
      let deletedCount = 0;
      let fixedCount = 0;
      
      const diskFileSet = new Set<string>();
      
      // 1. Read files and directories inside UPLOADS_DIR
      globalSyncStatus.progress = 'Đang quét thư mục trên server...';
      const rootItems = fs.readdirSync(UPLOADS_DIR, { withFileTypes: true });
      
      // Cache folders to minimize DB calls
      const folderMap = new Map<string, number>(); // name -> id
      const existingFolders = await prisma.folder.findMany();
      existingFolders.forEach(f => folderMap.set(f.name.toLowerCase(), f.id));

      const filesToProcess: { filename: string, folderId: number | null, path: string }[] = [];

      for (const item of rootItems) {
        if (item.isFile()) {
          // Unassigned file
          const filename = item.name;
          diskFileSet.add(filename.normalize('NFC'));
          filesToProcess.push({ filename, folderId: null, path: \`/uploads/\${filename}\` });
        } else if (item.isDirectory()) {
          // Subfolder
          const folderName = item.name;
          let folderId = folderMap.get(folderName.toLowerCase());
          
          if (!folderId) {
            const newFolder = await prisma.folder.create({ data: { name: folderName } });
            folderId = newFolder.id;
            folderMap.set(folderName.toLowerCase(), folderId);
          }

          const subItems = fs.readdirSync(path.join(UPLOADS_DIR, folderName), { withFileTypes: true });
          for (const subItem of subItems) {
            if (subItem.isFile()) {
              // Note: the filename in diskFileSet must be relative to UPLOADS_DIR for deletion checks
              const filename = \`\${folderName}/\${subItem.name}\`;
              diskFileSet.add(filename.normalize('NFC'));
              filesToProcess.push({ filename: subItem.name, folderId, path: \`/uploads/\${filename}\` });
            }
          }
        }
      }

      globalSyncStatus.progress = 'Đang dọn dẹp dữ liệu cũ...';
      
      // 2. Remove DB entries for files no longer existing on server disk & fix garbled DB names
      const dbFiles = await prisma.audioFile.findMany({ include: { folder: true } });
      
      for (const dbF of dbFiles) {
        let relPath = dbF.path.replace('/uploads/', '');
        const normalizedRelPath = decodeURIComponent(relPath).normalize('NFC');
  
        // Fix garbled DB display names if present
        const fixedName = getUtf8OriginalName(dbF.name);
        if (fixedName !== dbF.name) {
          await prisma.audioFile.update({
            where: { id: dbF.id },
            data: { name: fixedName }
          });
          fixedCount++;
        }
  
        if (!diskFileSet.has(normalizedRelPath) && !diskFileSet.has(dbF.filename)) {
          try {
            await prisma.playlistItem.deleteMany({ where: { audioFileId: dbF.id } });
            await prisma.audioFile.delete({ where: { id: dbF.id } });
            deletedCount++;
          } catch (dbErr) {
            console.error(\`Cannot remove orphaned file ID \${dbF.id} (\${dbF.filename}):\`, dbErr);
          }
        }
      }
      
      // 3. Add DB entries for new files
      const currentDbPaths = new Set((await prisma.audioFile.findMany()).map(f => decodeURIComponent(f.path.replace('/uploads/', '')).normalize('NFC')));
      
      let index = 0;
      for (const { filename, folderId, path: filePath } of filesToProcess) {
        index++;
        if (index % 10 === 0) {
          globalSyncStatus.progress = \`Đang đồng bộ file mới (\${index}/\${filesToProcess.length})...\`;
        }
        
        let relPath = filePath.replace('/uploads/', '');
        const normalizedRelPath = decodeURIComponent(relPath).normalize('NFC');
        
        if (!currentDbPaths.has(normalizedRelPath) && !currentDbPaths.has(filename.normalize('NFC'))) {
          // Avoid filename unique constraint crash by suffixing if duplicate
          let insertFilename = filename;
          let counter = 1;
          while (true) {
             const exist = await prisma.audioFile.findUnique({ where: { filename: insertFilename } });
             if (!exist) break;
             insertFilename = \`\${counter}_\${filename}\`;
             counter++;
          }
          
          const utf8FileName = getUtf8OriginalName(filename);
          const ext = path.extname(utf8FileName);
          const displayName = path.basename(utf8FileName, ext);
          
          await prisma.audioFile.create({
            data: {
              name: displayName || utf8FileName,
              filename: insertFilename,
              path: filePath,
              duration: 0,
              folderId
            }
          });
          addedCount++;
        }
      }

      globalSyncStatus = { isRunning: false, progress: 'Xong', addedCount, deletedCount, fixedCount, error: '' };
    } catch (err: any) {
      console.error('Sync failed:', err);
      globalSyncStatus = { isRunning: false, progress: '', addedCount: 0, deletedCount: 0, fixedCount: 0, error: 'Đồng bộ thất bại: ' + (err.message || 'Lỗi không xác định') };
    }
  })();
});

`;

code = before + newSyncLogic + after;
fs.writeFileSync('backend/src/routes/files.ts', code, 'utf8');