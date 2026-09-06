const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const files = await prisma.audioFile.findMany({ take: 5 });
  console.log(files);
  const folders = await prisma.folder.findMany();
  console.log("Folders:", folders);
}
run();