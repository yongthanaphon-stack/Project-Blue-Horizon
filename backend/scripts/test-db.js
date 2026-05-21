const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const filtered = await prisma.signal.findMany({ where: { deletedAt: null, workshopId: null }});
  console.log("Filtered signals:", filtered.length);
  if (filtered.length > 0) {
    console.log("Sample signal:", filtered[0].name, filtered[0].status, filtered[0].workshopId);
  }
}
main().finally(() => prisma.$disconnect());
