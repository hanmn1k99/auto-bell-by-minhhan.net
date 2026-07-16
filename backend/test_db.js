const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.device.findMany().then(res => console.log(res));
