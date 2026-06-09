require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const apply = process.argv.includes('--apply');

async function resolveActorId(prisma, signal) {
  if (signal.ownerId) return signal.ownerId;
  const admin = await prisma.user.findFirst({
    where: { role: { in: ['ADMIN', 'ADMIN_SYSTEM'] } },
    orderBy: { id: 'asc' },
  });
  if (!admin) throw new Error('No admin user found to attribute history.');
  return admin.id;
}

(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const candidates = await prisma.signal.findMany({
      where: {
        deletedAt: null,
        workshopId: null,
        OR: [{ isGlobal: false }, { status: { not: 'PUBLISHED' } }],
      },
      orderBy: { id: 'asc' },
    });

    console.log(`Signals not visible in Signal Bank: ${candidates.length}`);
    candidates.forEach((s) => {
      const changes = [];
      if (!s.isGlobal) changes.push('isGlobal:false->true');
      if (s.status !== 'PUBLISHED') changes.push(`status:${s.status}->PUBLISHED`);
      console.log(`  #${s.id} | ${s.name.slice(0, 45)} | ${changes.join(', ')}`);
    });

    if (!apply) {
      console.log('\nDry run only. Re-run with --apply to update.');
      return;
    }

    let updated = 0;
    for (const signal of candidates) {
      const actorId = await resolveActorId(prisma, signal);
      const changedFields = [];
      if (!signal.isGlobal) changedFields.push('isGlobal');
      if (signal.status !== 'PUBLISHED') changedFields.push('status');

      await prisma.signal.update({
        where: { id: signal.id },
        data: {
          isGlobal: true,
          status: 'PUBLISHED',
          histories: {
            create: {
              action: 'UPDATED',
              changes: JSON.stringify(changedFields),
              userId: actorId,
            },
          },
        },
      });
      updated += 1;
    }

    console.log(`\nUpdated ${updated} signal(s). They now appear in the Signal Bank.`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
