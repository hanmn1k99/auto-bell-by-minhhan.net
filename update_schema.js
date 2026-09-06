const fs = require('fs');
let code = fs.readFileSync('backend/prisma/schema.prisma', 'utf8');

if (!code.includes('order       Int         @default(0)')) {
    code = code.replace(
        /model Folder \{[\s\S]*?createdAt\s*DateTime\s*@default\(now\(\)\)/,
        match => match + "\n  order       Int         @default(0)"
    );
}

if (!code.includes('order        Int            @default(0)')) {
    code = code.replace(
        /model AudioFile \{[\s\S]*?createdAt\s*DateTime\s*@default\(now\(\)\)/,
        match => match + "\n  order        Int            @default(0)"
    );
}

fs.writeFileSync('backend/prisma/schema.prisma', code, 'utf8');
console.log("Done");