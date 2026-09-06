const fs = require('fs');
let text = fs.readFileSync('backend/src/routes/youtube.ts', 'utf8');

const route = \
// GET /api/youtube/suggest - Lấy gợi ý tìm kiếm
router.get('/suggest', async (req: Request, res: Response) => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string') return res.json([]);
    const url = \\\http://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=\\\\\\;
    const response = await fetch(url);
    const data = await response.json();
    res.json(data[1] || []);
  } catch (err: any) {
    res.status(500).json({ error: 'Lỗi lấy gợi ý YouTube' });
  }
});
\;

text = text.replace('router.post(\'/search\'', route + '\n// POST /api/youtube/search - Tìm kiếm video trên YouTube\nrouter.post(\'/search\'');

fs.writeFileSync('backend/src/routes/youtube.ts', text, 'utf8');