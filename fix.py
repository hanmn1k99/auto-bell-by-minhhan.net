import sys

content = open('backend/src/routes/files.ts', 'r', encoding='utf-8').read()

delete_route = """
// DELETE /api/files/:id - delete single audio file
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const file = await prisma.audioFile.findUnique({
      where: { id },
      include: { bells: true, periods: true }
    });
    if (!file) return res.status(404).json({ error: 'Tệp không tồn tại' });

    if (file.bells.length > 0 || file.periods.length > 0) {
      return res.status(400).json({
        error: `Không thể xóa tệp "${file.name}" vì đang được sử dụng trong ${file.bells.length} chuông báo hoặc ${file.periods.length} tiết học.`
      });
    }

    const decodedDbPath = decodeURIComponent(file.path);
    let fullPath = '';
    if (decodedDbPath.startsWith('/uploads/')) {
      const subPath = decodedDbPath.substring('/uploads/'.length);
      fullPath = path.join(UPLOADS_DIR, subPath);
    } else {
      fullPath = path.join(UPLOADS_DIR, path.basename(decodedDbPath));
    }
    
    if (fs.existsSync(fullPath)) {
      try { fs.unlinkSync(fullPath); } catch (e) { console.error('Unlink error:', e); }
    }

    await prisma.playlistItem.deleteMany({ where: { audioFileId: id } });
    await prisma.audioFile.delete({ where: { id } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Xóa tệp thất bại' });
  }
});
"""

content = content.replace('// GET /api/files', delete_route + '\n// GET /api/files')
open('backend/src/routes/files.ts', 'w', encoding='utf-8').write(content)