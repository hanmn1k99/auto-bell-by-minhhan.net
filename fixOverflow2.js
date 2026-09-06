const fs = require('fs');
let text = fs.readFileSync('frontend/src/components/admin/YouTubeTab.tsx', 'utf8');

text = text.replace(
  '<div className="card mb-4" style={{ padding: \'1.5rem\' }}>',
  '<div className="card mb-4" style={{ padding: \'1.5rem\', overflow: \'visible\' }}>'
);

fs.writeFileSync('frontend/src/components/admin/YouTubeTab.tsx', text, 'utf8');