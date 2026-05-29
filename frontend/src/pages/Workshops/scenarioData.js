export const FALLBACK_SCENARIOS = [];

const DEFAULT_SCENARIO = {
  id: 'scenario-pending',
  title: 'Scenario pending',
  description: 'Generate or select a scenario to view details.',
  focus: 'RESILIENCE FOCUS',
  probability: 'Probability pending',
  milestone: 'Milestone pending',
  keyDrivers: [],
  relatedSignals: [],
  resultTitle: 'Scenario pending',
  visual: 'resilience',
};

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

  if (FALLBACK_SCENARIOS.length) {
    if (id === '2' || title.includes('scenario b')) {
      return FALLBACK_SCENARIOS[1] || FALLBACK_SCENARIOS[0];
    }

    if (id === '1' || title.includes('scenario a')) {
      return FALLBACK_SCENARIOS[0];
    }

    return FALLBACK_SCENARIOS[index % FALLBACK_SCENARIOS.length];
  }

  return DEFAULT_SCENARIO;
}

export function getFocusClass(focus) {
  return FOCUS_CLASS[focus] || 'resilience';
}

export function createScenarioViewModel(scenario = {}, index = 0) {
  const source = scenario || {};
  const fallback = getFallbackByScenario(source, index);
  const hasSourceIdentity = source.id !== undefined && source.id !== null;

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
    relatedSignals: source.relatedSignals?.length
      ? source.relatedSignals
      : hasSourceIdentity
        ? []
        : fallback.relatedSignals,
    resultTitle: source.resultTitle || source.title || fallback.resultTitle,
    visual: source.visual || fallback.visual,
  };
}
