export const RADAR_STORAGE_VERSION = 1;

export function getRadarStorageKey(workshopId) {
  const safeWorkshopId = workshopId || 'draft';
  return `blue-horizon:workshop:${safeWorkshopId}:radar:v${RADAR_STORAGE_VERSION}`;
}

function isStoredRadarSignal(signal) {
  const idType = typeof signal?.id;
  return Boolean(
    signal
      && (idType === 'string' || idType === 'number')
      && typeof signal.name === 'string'
      && typeof signal.description === 'string'
      && signal.placement,
  );
}

export function readRadarSignalsFromStorage(
  workshopId,
  fallbackSignals = [],
  { persistFallback = false } = {},
) {
  if (typeof window === 'undefined') {
    return fallbackSignals;
  }

  try {
    const storageKey = getRadarStorageKey(workshopId);
    const savedValue = window.localStorage.getItem(storageKey);

    if (!savedValue) {
      if (persistFallback && fallbackSignals.length) {
        saveRadarSignalsToStorage(workshopId, fallbackSignals);
      }
      return fallbackSignals;
    }

    const parsedSignals = JSON.parse(savedValue);
    if (!Array.isArray(parsedSignals)) {
      return fallbackSignals;
    }

    return parsedSignals.filter(isStoredRadarSignal);
  } catch {
    return fallbackSignals;
  }
}

export function saveRadarSignalsToStorage(workshopId, signals) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(
      getRadarStorageKey(workshopId),
      JSON.stringify(signals),
    );
  } catch {
    // Local storage can fail in private browsing or when storage is full.
  }
}

export function toScenarioGenerationSignals(signals) {
  return signals
    .filter(signal => signal?.name && signal?.description)
    .map(signal => ({
      id: String(signal.id),
      name: signal.name,
      description: signal.description,
      category: signal.category,
      horizon: signal.horizon,
      horizonDetail: signal.horizonDetail,
      impactLevel: signal.impactLevel,
    }));
}
