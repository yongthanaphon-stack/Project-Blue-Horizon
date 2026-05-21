import { PrismaService } from './src/prisma/prisma.service';
import 'dotenv/config';

async function main() {
  const prisma = new PrismaService();
  await prisma.onModuleInit();
  const count = await prisma.signal.count();
  console.log("Count:", count);
  await prisma.onModuleDestroy();
}
main().catch(e => {
  console.error(e);
  process.exit(1);
});
