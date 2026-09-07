const fs = require('fs');
let code = fs.readFileSync('.github/workflows/deploy.yml', 'utf8');

// Replace the backend build steps in the CD job
const oldBackendBuild = `              echo "--- BUILDING BACKEND ---"
              npm install --production --legacy-peer-deps
              npx prisma generate
              npx prisma db push --accept-data-loss
              npx tsc`;

const newBackendBuild = `              echo "--- BUILDING BACKEND ---"
              npm install --legacy-peer-deps
              npx prisma generate
              npx prisma db push --accept-data-loss
              npx tsc
              npm prune --production --legacy-peer-deps`;

code = code.replace(oldBackendBuild, newBackendBuild);

fs.writeFileSync('.github/workflows/deploy.yml', code, 'utf8');
console.log("Done");