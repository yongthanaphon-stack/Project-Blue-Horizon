// Mock data fallback when backend is not running
export const mockSignals = [
  {
    id: 1, name: 'Quantum Cloud Adoption', shortDetails: 'Expansion of cloud providers offering QPU access.',
    description: 'Expansion of cloud providers offering QPU access. Major cloud platforms are integrating quantum processing units.',
    pestelCategories: ['TECHNOLOGICAL', 'ECONOMIC'], stakeholders: ['Academia', 'Industry', 'Tech Providers'],
    impactLevel: 'GLOBAL', timeHorizon: 'H2', impactScore: 8.4, totalVotes: 142, status: 'PUBLISHED',
    references: [{ id: 1, title: 'IBM Quantum Network Annual Report 2024', url: '#' }],
  },
  {
    id: 2, name: 'Decentralized Power Grids', shortDetails: 'Rise of community-owned solar and battery microgrids.',
    description: 'Rise of community-owned solar and battery microgrids powered by blockchain governance.',
    pestelCategories: ['ENVIRONMENTAL', 'SOCIAL'], stakeholders: ['Academia', 'SMEs', 'Public Health'],
    impactLevel: 'REGION', timeHorizon: 'H1', impactScore: 5.2, totalVotes: 89, status: 'PUBLISHED',
    references: [],
  },
  {
    id: 3, name: 'Lab-Grown Protein Scale', shortDetails: 'Cellular agriculture reaching cost parity with traditional meat.',
    description: 'Cellular agriculture reaching cost parity with traditional meat.',
    pestelCategories: ['ECONOMIC', 'TECHNOLOGICAL'], stakeholders: ['Industry', 'Startups'],
    impactLevel: 'GLOBAL', timeHorizon: 'H3', impactScore: 2.1, totalVotes: 56, status: 'PUBLISHED',
    references: [],
  },
  {
    id: 4, name: 'Bio-Digital Interfaces', shortDetails: 'Neurolink and similar tech moving to clinical trials.',
    description: 'Neurolink and similar tech moving to clinical trials.',
    pestelCategories: ['TECHNOLOGICAL', 'LEGAL'], stakeholders: ['Academia', 'HEI Administration'],
    impactLevel: 'GLOBAL', timeHorizon: 'H3', impactScore: 9.1, totalVotes: 201, status: 'PUBLISHED',
    references: [],
  },
  {
    id: 5, name: 'Decentralized Energy Grids in Southeast Asia',
    shortDetails: 'Rise of community-owned microgrids powered by blockchain governance.',
    description: 'Rise of community-owned microgrids powered by blockchain governance.',
    pestelCategories: ['TECHNOLOGICAL'], stakeholders: ['Academia', 'Industry', 'Startups'],
    impactLevel: 'REGION', timeHorizon: 'H2', impactScore: 8.4, totalVotes: 12, status: 'PUBLISHED',
    references: [],
  },
  {
    id: 6, name: 'Standardization of Carbon Credits 2.0',
    shortDetails: 'New global regulations aim to unify verification processes for forest-based carbon credits.',
    description: 'New global regulations aim to unify verification processes.',
    pestelCategories: ['ENVIRONMENTAL'], stakeholders: ['Administration', 'NGOs'],
    impactLevel: 'GLOBAL', timeHorizon: 'H1', impactScore: 2.1, totalVotes: 8, status: 'PUBLISHED',
    references: [],
  },
  {
    id: 7, name: 'Longevity-Oriented Urban Planning',
    shortDetails: 'Cities redesigning infrastructure to accommodate a rapidly growing 100+ population.',
    description: 'Cities redesigning infrastructure for a 100+ population.',
    pestelCategories: ['SOCIAL'], stakeholders: ['Administration', 'Public Health'],
    impactLevel: 'COUNTRY', timeHorizon: 'H3', impactScore: 5.8, totalVotes: 15, status: 'PUBLISHED',
    references: [],
  },
  {
    id: 8, name: 'Automated Border Sovereignty Protocols',
    shortDetails: 'AI-driven automated diplomacy tools used for real-time maritime border management.',
    description: 'AI-driven automated diplomacy tools for real-time maritime border management.',
    pestelCategories: ['POLITICAL'], stakeholders: ['Administration', 'HEI Administration'],
    impactLevel: 'GLOBAL', timeHorizon: 'H2', impactScore: 9.1, totalVotes: 42, status: 'PUBLISHED',
    references: [],
  },
  {
    id: 9, name: 'Synthetic Content Liability Acts',
    shortDetails: "EU's new framework holding AI developers directly liable for synthetic content.",
    description: "EU's new framework holding AI developers directly liable.",
    pestelCategories: ['LEGAL'], stakeholders: ['Industry', 'Startups', 'Administration'],
    impactLevel: 'REGION', timeHorizon: 'H1', impactScore: 4.2, totalVotes: 28, status: 'PUBLISHED',
    references: [],
  },
  {
    id: 10, name: 'The Rise of "Zero-Trust" Freelancing',
    shortDetails: 'Shift towards smart-contract escrow payments for 100% of micro-task labor.',
    description: 'Shift towards smart-contract escrow payments.',
    pestelCategories: ['ECONOMIC'], stakeholders: ['SMEs', 'Startups'],
    impactLevel: 'GLOBAL', timeHorizon: 'H1', impactScore: 1.5, totalVotes: 5, status: 'PUBLISHED',
    references: [],
  },
  {
    id: 11, name: 'AI-Driven Healthcare Innovation',
    shortDetails: 'Exploring the integration of generative AI in diagnostic workflows and patient care management.',
    description: 'Artificial Intelligence is rapidly transforming the healthcare landscape by providing tools for more accurate diagnosis, personalized treatment plans, and efficient administrative processes. At Prince Sultan University, this signal represents the intersection of our research capabilities and the national shift towards a digital-first healthcare economy.\n\nCurrent developments show a transition from predictive analytics to generative models capable of assisting in complex surgical planning and biochemical research.\n\nKey drivers include the massive datasets being generated by electronic health records and the increasing affordability of high-performance computing resources.',
    pestelCategories: ['TECHNOLOGICAL', 'SOCIAL'],
    stakeholders: ['Academia', 'HEI Administration', 'Public Health', 'Tech Providers', 'Medical Practitioners'],
    impactLevel: 'REGION', timeHorizon: 'H2', impactScore: 8.4, totalVotes: 1240, status: 'PUBLISHED',
    references: [
      { id: 1, title: 'Saudi Vision 2030 Healthcare Sector Transformation Program', url: '#' },
      { id: 2, title: 'WHO Report on AI Ethics in Global Health', url: '#' },
    ],
  },
];

export const mockWorkshops = [
  {
    id: 1, name: 'University Executive Meeting', horizon: 'H1', isActive: true,
    description: 'ประชุมคณะกรรมการบริหารมหาวิทยาลัย (ก.บ.ม.) ประจำปี 2569',
    lastActive: new Date(Date.now() - 22 * 60000).toISOString(),
    _count: { participants: 4 },
  },
  {
    id: 2, name: 'Urban Mobility 2030', horizon: 'H2', isActive: true,
    description: 'Synthesizing low-emission transit signals into a municipal policy...',
    lastActive: new Date(Date.now() - 120 * 60000).toISOString(),
    _count: { participants: 2 },
  },
  {
    id: 3, name: 'Gen-AI Regulatory Response', horizon: 'H3', isActive: true,
    description: 'Mapping liability frameworks for synthetic content across major EU...',
    lastActive: new Date(Date.now() - 300 * 60000).toISOString(),
    _count: { participants: 1 },
  },
];

export const mockOutputs = [
  { id: 1, name: 'ASEAN Energy Independence Roadmap 2040', type: 'Strategy Deck', createdBy: 'Sarah Chen', date: '2023-10-14' },
  { id: 2, name: 'Circular Economy Policy - Lab Summary', type: 'Workshop Log', createdBy: 'Dr. Alex Miller', date: '2023-10-12' },
  { id: 3, name: 'Digital Sovereignty Impact Matrix', type: 'Analysis Paper', createdBy: 'Mark Thompson', date: '2023-10-09' },
];

export const mockScenarios = [];

export const mockSwot = {
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
};

export const mockRadarSignals = [
  { id: 1, name: 'Graphene-based Supercapacitors', category: 'TECHNOLOGY', description: 'Breakthrough in energy density and charge speeds.', priority: 'high' },
  { id: 2, name: 'Peer-to-Peer Energy Trading', category: 'ECONOMIC', description: 'Localized microgrids bypassing traditional utilities.', priority: 'medium' },
  { id: 3, name: 'Ocean Thermal Conversion', category: 'ENVIRONMENTAL', description: 'Harnessing temperature gradients for baseload power.', priority: 'low' },
  { id: 4, name: 'Decentralized Autonomous Power Co-ops', category: 'SOCIAL', description: 'Community-owned energy systems via DAO governance.', priority: 'high' },
];
