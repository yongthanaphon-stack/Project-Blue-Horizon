import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

type RecoveredSignal = {
  sourceId: string;
  name: string;
  shortDetails: string | null;
  description: string;
  referenceSource: string | null;
  pestelCategories: string[];
  stakeholders: string[];
  impactLevel: 'GLOBAL' | 'REGION' | 'COUNTRY';
  timeHorizon: 'H1' | 'H2' | 'H3';
  geoDetail: string | null;
};

async function main() {
  const file = join(__dirname, 'recovered-signals.json');
  const signals: RecoveredSignal[] = JSON.parse(readFileSync(file, 'utf-8'));
  console.log(`Recovering ${signals.length} signals from ${file}`);

  let created = 0;
  let skipped = 0;

  for (const s of signals) {
    // Idempotent: skip if a signal with the same name already exists (not soft-deleted).
    const existing = await prisma.signal.findFirst({
      where: { name: s.name, deletedAt: null },
    });
    if (existing) {
      skipped++;
      continue;
    }

    await prisma.signal.create({
      data: {
        name: s.name,
        shortDetails: s.shortDetails ?? undefined,
        description: s.description,
        referenceSource: s.referenceSource ?? undefined,
        pestelCategories: s.pestelCategories as never,
        stakeholders: s.stakeholders,
        impactLevel: s.impactLevel as never,
        timeHorizon: s.timeHorizon as never,
        status: 'PUBLISHED',
        isGlobal: true,
      },
    });
    created++;
  }

  console.log(`Done. created=${created}, skipped(existing)=${skipped}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
