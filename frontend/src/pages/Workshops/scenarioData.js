export const FALLBACK_SCENARIOS = [
  {
    id: 'distributed-resilience',
    title: 'Scenario A: Distributed Resilience',
    description: 'A world where local networks drive global stability through decentralized energy and data infrastructure. Small-scale manufacturing becomes the backbone of urban centers.',
    focus: 'RESILIENCE FOCUS',
    probability: 'HIGH PROBABILITY',
    milestone: '2025 Q3 MILESTONE',
    keyDrivers: ['Decentralized Energy', 'Edge Computing', 'Circular Economies'],
    relatedSignals: ['#Logistics-Shift', '#GreenEnergy', '#EUMarkets', '#LocalSourcing'],
    resultTitle: 'The Decentralized Renaissance',
    visual: 'resilience',
  },
  {
    id: 'regulated-monopolies',
    title: 'Scenario B: Regulated Monopolies',
    description: 'Centralized authorities enforce strict market controls to maintain service parity. Innovation is slow but predictable, and critical services are heavily subsidized.',
    focus: 'STABILITY FOCUS',
    probability: 'MEDIUM PROBABILITY',
    milestone: '2026 POLICY WATCH',
    keyDrivers: ['Public Policy', 'Big Tech Regulation', 'Universal Basic Services'],
    relatedSignals: ['#PolicyShift', '#MarketControls', '#ServiceParity', '#PublicTrust'],
    resultTitle: 'The Regulated Continuity Model',
    visual: 'stability',
  },
];

const FOCUS_CLASS = {
  'RESILIENCE FOCUS': 'resilience',
  'STABILITY FOCUS': 'stability',
  'RISK FOCUS': 'risk',
};

function getScenarioTitle(scenario) {
  return String(scenario?.title || '').toLowerCase();
}

function getFallbackByScenario(scenario, index = 0) {
  const title = getScenarioTitle(scenario);
  const id = String(scenario?.id || '');

  if (id === '2' || title.includes('scenario b') || title.includes('regulated monopolies')) {
    return FALLBACK_SCENARIOS[1];
  }

  if (id === '1' || title.includes('scenario a') || title.includes('distributed resilience')) {
    return FALLBACK_SCENARIOS[0];
  }

  return FALLBACK_SCENARIOS[index % FALLBACK_SCENARIOS.length];
}

export function getFocusClass(focus) {
  return FOCUS_CLASS[focus] || 'resilience';
}

export function createScenarioViewModel(scenario = {}, index = 0) {
  const source = scenario || {};
  const fallback = getFallbackByScenario(source, index);

  return {
    ...fallback,
    ...source,
    id: source.id || fallback.id,
    title: source.title || fallback.title,
    description: source.description || fallback.description,
    focus: source.focus || fallback.focus,
    probability: source.probability || fallback.probability,
    milestone: source.milestone || fallback.milestone,
    keyDrivers: source.keyDrivers?.length ? source.keyDrivers : fallback.keyDrivers,
    relatedSignals: source.relatedSignals?.length ? source.relatedSignals : fallback.relatedSignals,
    resultTitle: source.resultTitle || fallback.resultTitle,
    visual: source.visual || fallback.visual,
  };
}
