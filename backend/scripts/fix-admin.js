const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();
async function main() {
  const hash = await bcrypt.hash('admin123', 10);
  await prisma.user.update({
    where: { email: 'admin@bluehorizon.com' },
    data: { passwordHash: hash }
  });
  console.log("Admin password updated");
}
main().finally(() => prisma.$disconnect());
