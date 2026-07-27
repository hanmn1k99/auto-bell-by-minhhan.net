const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.audioFile.findMany().then(files => {
  console.log(JSON.stringify(files, null, 2));
}).finally(() => {
  prisma.$disconnect();
});
