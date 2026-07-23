import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import { authenticateToken } from '../middleware/auth';
import multer from 'multer';

const router = Router();
const upload = multer(); // For parsing CSV in memory

// GET /api/bells
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const bells = await prisma.bellConfig.findMany({
      include: { audioFile: true, department: true },
      orderBy: { time: 'asc' },
    });
    res.json(bells);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get bells' });
  }
});

// POST /api/bells
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { departmentId, time, audioFileId, daysOfWeek, isActive, volume, name } = req.body;
    if (!departmentId || !time || !audioFileId || !daysOfWeek) {
      return res.status(400).json({ error: 'All fields required' });
    }
    const bell = await prisma.bellConfig.create({
      data: { departmentId: Number(departmentId), time, audioFileId: Number(audioFileId), daysOfWeek, isActive: isActive ?? true, volume: volume ?? 1.0, name },
      include: { audioFile: true, department: true },
    });
    res.status(201).json(bell);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create bell' });
  }
});

// POST /api/bells/bulk
router.post('/bulk', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { departmentId, times, audioFileId, daysOfWeek, isActive, volume, baseName } = req.body;
    if (!departmentId || !times || !Array.isArray(times) || !audioFileId || !daysOfWeek) {
      return res.status(400).json({ error: 'All fields required' });
    }
    
    const createdBells = [];
    for (let i = 0; i < times.length; i++) {
      let bellName = baseName;
      if (baseName && times.length > 1) {
         // Auto append index if multiple
         bellName = `${baseName} ${i+1}`;
      }

      const bell = await prisma.bellConfig.create({
        data: {
          departmentId: Number(departmentId),
          time: times[i],
          audioFileId: Number(audioFileId),
          daysOfWeek,
          isActive: isActive ?? true,
          volume: volume ?? 1.0,
          name: bellName
        },
        include: { audioFile: true, department: true },
      });
      createdBells.push(bell);
    }
    
    res.status(201).json(createdBells);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create bulk bells' });
  }
});

// GET /api/bells/template
router.get('/template', authenticateToken, async (req: Request, res: Response) => {
  try {
    const deps = await prisma.department.findMany();
    
    let csv = '\uFEFF'; // BOM for Excel
    csv += 'Phòng ban (Bắt buộc),Tên chuông,Thời gian (HH:mm:ss),Tên file âm thanh,Ngày lặp lại (1=T2, 2=T3..., 0=CN),Âm lượng (0.0 đến 1.0)\n';
    
    if (deps.length > 0) {
      csv += `${deps[0].name},Tiết 1,07:00:00,Chuong.mp3,"1,2,3,4,5",1.0\n`;
      csv += `${deps[0].name},Tiết 2,07:45:00,Chuong.mp3,"1,2,3,4,5",1.0\n`;
    } else {
      csv += `Văn phòng,Mẫu chuông,08:00:00,Chuong.mp3,"1,2,3,4,5",1.0\n`;
    }
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="autobells_template.csv"');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate template' });
  }
});

// POST /api/bells/import
router.post('/import', authenticateToken, upload.single('file'), async (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  try {
    const csvData = req.file.buffer.toString('utf-8');
    // Skip BOM if present
    const cleanData = csvData.replace(/^\uFEFF/, '');
    const lines = cleanData.split(/\r?\n/).filter(line => line.trim() !== '');
    
    if (lines.length <= 1) return res.status(400).json({ error: 'File is empty or only has header' });
    
    const errors = [];
    let addedCount = 0;
    
    // Process from line 1 (skip header 0)
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',').map(s => {
        // Strip quotes if present
        let val = s.trim();
        if (val.startsWith('"') && val.endsWith('"')) {
           val = val.substring(1, val.length - 1);
        }
        return val;
      });
      
      if (parts.length < 5) continue; // Skip malformed rows
      
      const [depName, bellName, time, audioFileName, days, volStr] = parts;
      
      // Validation
      if (!depName || !time || !audioFileName || !days) {
        errors.push(`Dòng ${i+1}: Thiếu thông tin bắt buộc.`);
        continue;
      }
      
      if (!time.match(/^\d{2}:\d{2}:\d{2}$/)) {
         errors.push(`Dòng ${i+1}: Thời gian không đúng chuẩn HH:mm:ss.`);
         continue;
      }

      // Find references
      let department = await prisma.department.findUnique({ where: { name: depName } });
      if (!department) {
        department = await prisma.department.create({ data: { name: depName } }); // Auto create if not exist
      }
      
      const audioFile = await prisma.audioFile.findUnique({ where: { filename: audioFileName } });
      if (!audioFile) {
        errors.push(`Dòng ${i+1}: Không tìm thấy file âm thanh '${audioFileName}'. Hãy đảm bảo bạn đã tải file này lên.`);
        continue;
      }
      
      let volume = parseFloat(volStr);
      if (isNaN(volume)) volume = 1.0;
      
      await prisma.bellConfig.create({
        data: {
          departmentId: department.id,
          name: bellName,
          time: time,
          audioFileId: audioFile.id,
          daysOfWeek: days,
          volume: volume
        }
      });
      
      addedCount++;
    }
    
    res.json({ success: true, addedCount, errors });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to process CSV import' });
  }
});

// POST /api/bells/bulk-update-audio (backward compatible) & /api/bells/bulk-update
router.post('/bulk-update', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { ids, audioFileId, isActive } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Danh sách ID không được để trống' });
    }
    const dataToUpdate: any = {};
    if (audioFileId !== undefined && audioFileId !== null && audioFileId !== '') {
      dataToUpdate.audioFileId = Number(audioFileId);
    }
    if (typeof isActive === 'boolean') {
      dataToUpdate.isActive = isActive;
    }
    if (Object.keys(dataToUpdate).length === 0) {
      return res.status(400).json({ error: 'Chưa chọn thông tin nào cần sửa' });
    }
    await prisma.bellConfig.updateMany({
      where: { id: { in: ids.map(Number) } },
      data: dataToUpdate,
    });
    res.json({ success: true, updatedCount: ids.length });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi sửa hàng loạt chuông báo' });
  }
});

router.post('/bulk-update-audio', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { ids, audioFileId, isActive } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids (array) is required' });
    }
    const dataToUpdate: any = {};
    if (audioFileId !== undefined && audioFileId !== null && audioFileId !== '') {
      dataToUpdate.audioFileId = Number(audioFileId);
    }
    if (typeof isActive === 'boolean') {
      dataToUpdate.isActive = isActive;
    }
    await prisma.bellConfig.updateMany({
      where: { id: { in: ids.map(Number) } },
      data: dataToUpdate,
    });
    res.json({ success: true, updatedCount: ids.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to bulk update audio' });
  }
});

// POST /api/bells/bulk-delete
router.post('/bulk-delete', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids (array) is required' });
    }
    await prisma.bellConfig.deleteMany({
      where: { id: { in: ids.map(Number) } },
    });
    res.json({ success: true, deletedCount: ids.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to bulk delete bells' });
  }
});

// PUT /api/bells/:id
router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { departmentId, time, audioFileId, daysOfWeek, isActive, volume, name } = req.body;
    const bell = await prisma.bellConfig.update({
      where: { id: Number(req.params.id) },
      data: { departmentId: Number(departmentId), time, audioFileId: Number(audioFileId), daysOfWeek, isActive, volume: volume ?? 1.0, name },
      include: { audioFile: true, department: true },
    });
    res.json(bell);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update bell' });
  }
});

// DELETE /api/bells/:id
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    await prisma.bellConfig.delete({ where: { id: Number(req.params.id) } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete bell' });
  }
});

export default router;
