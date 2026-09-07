with open('backend/src/routes/files.ts', 'r', encoding='utf-8') as f:
    content = f.read()

old = "    const fs = require('fs');\n    const path = require('path');\n    \n    if (decodedDbPath"
new = "    if (decodedDbPath"
content = content.replace(old, new)

with open('backend/src/routes/files.ts', 'w', encoding='utf-8') as f:
    f.write(content)