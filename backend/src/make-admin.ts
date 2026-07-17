import { PrismaClient } from '@prisma/client';
import readline from 'readline';

const prisma = new PrismaClient();
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function main() {
  const users = await prisma.user.findMany();
  if (users.length === 0) {
    console.log('Không có tài khoản nào trong hệ thống. Hãy vào web để cài đặt lần đầu.');
    process.exit(0);
  }

  console.log('Danh sách tài khoản hiện tại:');
  users.forEach(u => {
    console.log(`- ${u.username} (Role: ${u.role})`);
  });

  rl.question('Nhập username muốn cấp quyền ADMIN: ', async (username) => {
    if (!username) {
      console.log('Hủy.');
      process.exit(0);
    }
    
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      console.log('Không tìm thấy user này!');
      process.exit(0);
    }

    await prisma.user.update({
      where: { username },
      data: { role: 'ADMIN' }
    });

    console.log(`Đã cấp quyền ADMIN cho tài khoản: ${username}`);
    console.log('Vui lòng ĐĂNG XUẤT và ĐĂNG NHẬP LẠI trên web để nhận quyền mới.');
    process.exit(0);
  });
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
