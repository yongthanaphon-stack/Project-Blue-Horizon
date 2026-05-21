import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding Blue Horizon database...');
  const adminPasswordHash = await bcrypt.hash('admin123', 10);

  // Create only the admin user (remove demo analyst/demo admin users)
  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'admin@bluehorizon.com' },
      update: { passwordHash: adminPasswordHash, role: 'ADMIN' },
      create: {
        name: 'Blue Horizon Admin',
        email: 'admin@bluehorizon.com',
        passwordHash: adminPasswordHash,
        role: 'ADMIN',
      },
    }),
  ]);

  // Clear existing mock data to prevent duplicates on re-seeding
  await prisma.notification.deleteMany({});
  await prisma.notificationPreference.deleteMany({});
  await prisma.scenario.deleteMany({});
  await prisma.workshop.deleteMany({});
  await prisma.signal.deleteMany({});

  // Create signals matching wireframes
  const signals = await Promise.all([
    prisma.signal.create({
      data: {
        name: 'Quantum Cloud Adoption',
        shortDetails: 'Expansion of cloud providers offering QPU access.',
        description: 'Expansion of cloud providers offering QPU access. Major cloud platforms are beginning to integrate quantum processing units into their service offerings, enabling researchers and enterprises to leverage quantum computing capabilities without owning specialized hardware.',
        pestelCategories: ['TECHNOLOGICAL', 'ECONOMIC'],
        stakeholders: ['Academia', 'Industry', 'Tech Providers'],
        impactLevel: 'GLOBAL',
        timeHorizon: 'H2',
        impactScore: 8.4,
        totalVotes: 142,
        references: {
          create: [
            { title: 'IBM Quantum Network Annual Report 2024', url: 'https://example.com/ibm-quantum' },
            { title: 'Google Quantum AI Roadmap', url: 'https://example.com/google-quantum' },
          ],
        },
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
      },
    }),
    prisma.signal.create({
      data: {
        name: 'Decentralized Power Grids',
        shortDetails: 'Rise of community-owned solar and battery microgrids.',
        description: 'Rise of community-owned solar and battery microgrids. Communities worldwide are establishing locally-owned energy infrastructure, combining distributed solar generation with battery storage systems to create resilient, independent power networks.',
        pestelCategories: ['ENVIRONMENTAL', 'SOCIAL'],
        stakeholders: ['Academia', 'SMEs', 'Public Health'],
        impactLevel: 'REGION',
        timeHorizon: 'H1',
        impactScore: 5.2,
        totalVotes: 89,
        references: {
          create: [
            { title: 'IRENA Community Energy Report', url: 'https://example.com/irena' },
          ],
        },
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
      },
    }),
    prisma.signal.create({
      data: {
        name: 'Lab-Grown Protein Scale',
        shortDetails: 'Cellular agriculture reaching cost parity with traditional meat.',
        description: 'Cellular agriculture reaching cost parity with traditional meat. Advanced bioreactor designs and improved cell culture media are driving down production costs, bringing lab-grown protein products within competitive range of conventional agriculture.',
        pestelCategories: ['ECONOMIC', 'TECHNOLOGICAL'],
        stakeholders: ['Industry', 'Startups', 'VCs/Investors'],
        impactLevel: 'GLOBAL',
        timeHorizon: 'H3',
        impactScore: 2.1,
        totalVotes: 56,
        status: 'PUBLISHED',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
      },
    }),
    prisma.signal.create({
      data: {
        name: 'Bio-Digital Interfaces',
        shortDetails: 'Neurolink and similar tech moving to clinical trials.',
        description: 'Neurolink and similar tech moving to clinical trials. Brain-computer interface technologies are advancing from research prototypes to clinical applications, with multiple companies entering regulatory approval processes for therapeutic devices.',
        pestelCategories: ['TECHNOLOGICAL', 'LEGAL'],
        stakeholders: ['Academia', 'HEI Administration', 'Medical Practitioners'],
        impactLevel: 'GLOBAL',
        timeHorizon: 'H3',
        impactScore: 9.1,
        totalVotes: 201,
        references: {
          create: [
            { title: 'FDA Brain-Computer Interface Guidelines 2024', url: 'https://example.com/fda-bci' },
          ],
        },
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
      },
    }),
    prisma.signal.create({
      data: {
        name: 'Decentralized Energy Grids in Southeast Asia',
        shortDetails: 'Rise of community-owned microgrids powered by blockchain governance.',
        description: 'Rise of community-owned microgrids powered by blockchain governance. Southeast Asian communities are implementing decentralized energy systems with transparent governance mechanisms, combining renewable energy sources with blockchain-based management protocols.',
        pestelCategories: ['TECHNOLOGICAL'],
        stakeholders: ['Academia', 'Industry', 'Startups'],
        impactLevel: 'REGION',
        timeHorizon: 'H2',
        impactScore: 8.4,
        totalVotes: 12,
        status: 'PUBLISHED',
        createdAt: new Date(Date.now() - 1000), // 1 sec ago (1st)
      },
    }),
    prisma.signal.create({
      data: {
        name: 'Standardization of Carbon Credits 2.0',
        shortDetails: 'New global regulations aim to unify verification processes for forest-based carbon credits.',
        description: 'New global regulations aim to unify verification processes for forest-based carbon credits. International bodies are developing standardized frameworks to ensure the integrity and comparability of carbon offset programs across different jurisdictions.',
        pestelCategories: ['ENVIRONMENTAL'],
        stakeholders: ['Administration', 'NGOs'],
        impactLevel: 'GLOBAL',
        timeHorizon: 'H1',
        impactScore: 2.1,
        totalVotes: 8,
        status: 'PUBLISHED',
        createdAt: new Date(Date.now() - 2000), // 2 sec ago (2nd)
      },
    }),
    prisma.signal.create({
      data: {
        name: 'Longevity-Oriented Urban Planning',
        shortDetails: 'Cities redesigning infrastructure to accommodate a rapidly growing 100+ population.',
        description: 'Cities redesigning infrastructure to accommodate a rapidly growing 100+ population. Urban planners are rethinking city design to support aging populations, incorporating accessibility features, healthcare proximity, and social infrastructure for extended lifespans.',
        pestelCategories: ['SOCIAL'],
        stakeholders: ['Administration', 'Public Health'],
        impactLevel: 'COUNTRY',
        timeHorizon: 'H3',
        impactScore: 5.8,
        totalVotes: 15,
        status: 'PUBLISHED',
        createdAt: new Date(Date.now() - 3000), // 3 sec ago (3rd)
      },
    }),
    prisma.signal.create({
      data: {
        name: 'Automated Border Sovereignty Protocols',
        shortDetails: 'AI-driven automated diplomacy tools used for real-time maritime border management.',
        description: 'AI-driven automated diplomacy tools used for real-time maritime border management. Nations are deploying artificial intelligence systems to monitor, negotiate, and enforce maritime boundaries in real-time, fundamentally changing how territorial sovereignty is maintained.',
        pestelCategories: ['POLITICAL'],
        stakeholders: ['Administration', 'HEI Administration'],
        impactLevel: 'GLOBAL',
        timeHorizon: 'H2',
        impactScore: 9.1,
        totalVotes: 42,
        status: 'PUBLISHED',
        isGlobal: true,
        createdAt: new Date(Date.now() - 4000), // 4 sec ago (4th)
      },
    }),
    prisma.signal.create({
      data: {
        name: 'Synthetic Content Liability Acts',
        shortDetails: "EU's new framework holding AI developers directly liable for synthetic content.",
        description: "EU's new framework holding AI developers directly liable for synthetic content. The European Union is establishing legal frameworks that place direct responsibility on AI developers for the content generated by their systems, setting precedents for global AI governance.",
        pestelCategories: ['LEGAL'],
        stakeholders: ['Industry', 'Startups', 'Administration'],
        impactLevel: 'REGION',
        timeHorizon: 'H1',
        impactScore: 4.2,
        totalVotes: 28,
        status: 'PUBLISHED',
        isGlobal: true,
        createdAt: new Date(Date.now() - 5000), // 5 sec ago (5th)
      },
    }),
    prisma.signal.create({
      data: {
        name: 'The Rise of "Zero-Trust" Freelancing',
        shortDetails: 'Shift towards smart-contract escrow payments for 100% of micro-task labor.',
        description: 'Shift towards smart-contract escrow payments for 100% of micro-task labor. The gig economy is transitioning to blockchain-based payment systems where all transactions are secured through smart contracts, eliminating the need for traditional trust intermediaries.',
        pestelCategories: ['ECONOMIC'],
        stakeholders: ['SMEs', 'Startups', 'VCs/Investors'],
        impactLevel: 'GLOBAL',
        timeHorizon: 'H1',
        impactScore: 1.5,
        totalVotes: 5,
        status: 'PUBLISHED',
        isGlobal: true,
        createdAt: new Date(Date.now() - 6000), // 6 sec ago (6th)
      },
    }),
    prisma.signal.create({
      data: {
        name: 'AI-Driven Healthcare Innovation',
        shortDetails: 'Exploring the integration of generative AI in diagnostic workflows and patient care management.',
        description: 'Artificial Intelligence is rapidly transforming the healthcare landscape by providing tools for more accurate diagnosis, personalized treatment plans, and efficient administrative processes. At Prince Sultan University, this signal represents the intersection of our research capabilities and the national shift towards a digital-first healthcare economy.\n\nCurrent developments show a transition from predictive analytics to generative models capable of assisting in complex surgical planning and biochemical research. The integration of these technologies into the curriculum of PSU\'s College of Health Sciences is no longer optional but a strategic imperative to ensure our graduates remain at the forefront of the industry.\n\nKey drivers include the massive datasets being generated by electronic health records and the increasing affordability of high-performance computing resources. However, ethical considerations regarding data privacy and the accountability of AI decisions remain significant hurdles that PSU\'s Ethics Committee must navigate.',
        pestelCategories: ['TECHNOLOGICAL', 'SOCIAL'],
        stakeholders: ['Academia', 'HEI Administration', 'Public Health', 'Tech Providers', 'Medical Practitioners'],
        impactLevel: 'REGION',
        timeHorizon: 'H2',
        impactScore: 8.4,
        totalVotes: 1240,
        status: 'PUBLISHED',
        isGlobal: true,
        references: {
          create: [
            { title: 'Saudi Vision 2030 Healthcare Sector Transformation Program', url: 'https://example.com/vision2030-health' },
            { title: 'WHO Report on AI Ethics in Global Health', url: 'https://example.com/who-ai-ethics' },
          ],
        },
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 24 hours ago
      },
    }),
  ]);

  // Create workshops
  const workshop1 = await prisma.workshop.create({
    data: {
      name: 'University Executive Meeting',
      description: 'ประชุมคณะกรรมการบริหารมหาวิทยาลัย (ก.บ.ม.) ประจำปี 2569',
      horizon: 'H1',
      isActive: true,
      participants: {
        create: users.map((u) => ({ userId: u.id })),
      },
    },
  });

  await prisma.workshop.create({
    data: {
      name: 'Urban Mobility 2030',
      description: 'Synthesizing low-emission transit signals into a municipal policy...',
      horizon: 'H2',
      isActive: true,
      participants: {
        create: [{ userId: users[0].id }],
      },
    },
  });

  await prisma.workshop.create({
    data: {
      name: 'Gen-AI Regulatory Response',
      description: 'Mapping liability frameworks for synthetic content across major EU...',
      horizon: 'H3',
      isActive: true,
    },
  });

  // Workshop outputs
  const workshopOutputs = [
    { name: 'ASEAN Energy Independence Roadmap 2040', type: 'Strategy Deck', createdBy: 'Sarah Chen', workshopId: workshop1.id, date: new Date('2023-10-14') },
    { name: 'Circular Economy Policy - Lab Summary', type: 'Workshop Log', createdBy: 'Dr. Alex Miller', workshopId: workshop1.id, date: new Date('2023-10-12') },
    { name: 'Digital Sovereignty Impact Matrix', type: 'Analysis Paper', createdBy: 'Mark Thompson', workshopId: workshop1.id, date: new Date('2023-10-09') },
  ];

  for (const output of workshopOutputs) {
    const existingOutput = await prisma.workshopOutput.findFirst({
      where: {
        name: output.name,
        type: output.type,
        createdBy: output.createdBy,
        date: output.date,
      },
      orderBy: { id: 'desc' },
    });

    if (existingOutput) {
      await prisma.workshopOutput.update({
        where: { id: existingOutput.id },
        data: { workshopId: workshop1.id },
      });
    } else {
      await prisma.workshopOutput.create({ data: output });
    }
  }

  // Create scenarios for workshop1
  const scenario1 = await prisma.scenario.create({
    data: {
      title: 'Scenario A: Distributed Resilience',
      description: 'A world where local networks drive global stability through decentralized energy and data infrastructure. Small-scale manufacturing becomes the backbone of urban centers.',
      focus: 'RISK FOCUS',
      probability: 'HIGH PROBABILITY',
      milestone: '2025 Q3 MILESTONE',
      keyDrivers: ['Decentralized Energy', 'Edge Computing', 'Circular Economies'],
      isSelected: true,
      workshopId: workshop1.id,
    },
  });

  await prisma.scenario.create({
    data: {
      title: 'Scenario B: Regulated Monopolies',
      description: 'Centralized authorities enforce strict market controls to maintain service parity. Innovation is slow but predictable, and critical services are heavily subsidized.',
      focus: 'STABILITY FOCUS',
      keyDrivers: ['Public Policy', 'Big Tech Regulation', 'Universal Basic Services'],
      workshopId: workshop1.id,
    },
  });

  // Create SWOT for scenario1
  await prisma.swotAnalysis.create({
    data: {
      scenarioId: scenario1.id,
      strengths: [
        'High modularity in local infrastructure allows for rapid failure isolation.',
        'Strong community-driven innovation hubs reduce reliance on central R&D.',
        'Diverse talent pool across decentralized geographic locations.',
      ],
      weaknesses: [
        'Fragmented resource management leads to duplication of efforts across nodes.',
        'High initial capital expenditure for multi-node setup.',
        'Complex governance models slow down global decision-making.',
      ],
      opportunities: [
        'Emerging blockchain-based policy frameworks for autonomous coordination.',
        'Expansion into underdeveloped markets through micro-resilience units.',
        "Strategic partnerships with local governments for 'Grid-as-a-Service'.",
      ],
      threats: [
        'Increasing climate volatility exceeding the design limits of local nodes.',
        'Geopolitical shifts leading to trade restrictions on critical components.',
        'Centralized incumbents lobbying for restrictive regulatory barriers.',
      ],
    },
  });

  await prisma.notificationPreference.upsert({
    where: { userId: users[0].id },
    update: {
      dailySummary: true,
      signalVotes: true,
      workshopReminders: true,
    },
    create: {
      userId: users[0].id,
      dailySummary: true,
      signalVotes: true,
      workshopReminders: true,
    },
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: users[0].id,
        type: 'SIGNAL_NEEDS_VOTE',
        title: 'New signal needs your vote',
        message: `${signals[7].name} is ready for impact scoring in the Signal Bank.`,
        href: `/signals/${signals[7].id}`,
        metadata: { signalId: signals[7].id },
      },
      {
        userId: users[0].id,
        type: 'SCENARIO_SELECTED',
        title: 'Scenario selected',
        message: `${scenario1.title} was selected for SWOT analysis.`,
        href: `/workshop/${workshop1.id}/scenarios/${scenario1.id}/swot`,
        metadata: { scenarioId: scenario1.id, workshopId: workshop1.id },
      },
      {
        userId: users[0].id,
        type: 'DAILY_SUMMARY',
        title: 'Daily scanning summary',
        message: '12 new signals were added across Technology, Legal, and Environment.',
        href: '/signals',
        readAt: new Date(),
        metadata: { count: 12 },
      },
    ],
  });

  console.log('✅ Seed data created successfully!');
  console.log(`   - ${users.length} users`);
  console.log(`   - ${signals.length} signals`);
  console.log('   - 3 workshops');
  console.log('   - 2 scenarios + SWOT analysis');
  console.log('   - notification preferences + starter notifications');
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
