const fs = require('fs');
let code = fs.readFileSync('backend/src/routes/files.ts', 'utf8');

const diagCode = `
// GET /api/files/diagnostic
router.get('/diagnostic', (req: Request, res: Response) => {
  try {
    const rootItems = fs.existsSync(UPLOADS_DIR) ? fs.readdirSync(UPLOADS_DIR) : [];
    res.json({
      UPLOADS_DIR,
      ASSETS_DIR,
      __dirname,
      rootItems
    });
  } catch (err: any) {
    res.json({ error: err.message, UPLOADS_DIR, __dirname });
  }
});
`;

code = code.replace("const router = Router();", "const router = Router();\n" + diagCode);
fs.writeFileSync('backend/src/routes/files.ts', code, 'utf8');