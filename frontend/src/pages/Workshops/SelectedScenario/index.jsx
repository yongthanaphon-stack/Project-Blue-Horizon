import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Bookmark, CheckCircle2, Lock, ShieldCheck } from 'lucide-react';
import { scenariosApi, workshopsApi } from '../../../api/api';
import WorkshopAvatarStack from '../../../components/WorkshopAvatarStack';
import { useWorkshopSessionPresence } from '../../../hooks/useRealtimePresence';
import { mockScenarios } from '../../../mocks/mockData';
import { FALLBACK_SCENARIOS, createScenarioViewModel, getFocusClass } from '../scenarioData';

const BOOKMARK_STORAGE_PREFIX = 'blueHorizonSelectedScenarioBookmarks';

function getBookmarkStorageKey(workshopId) {
  return `${BOOKMARK_STORAGE_PREFIX}:${workshopId || 'default'}`;
}

function readBookmarkedScenarioIds(storageKey) {
  if (typeof window === 'undefined') return [];

  try {
    const rawValue = window.localStorage.getItem(storageKey);
    const parsedValue = rawValue ? JSON.parse(rawValue) : [];

    return Array.isArray(parsedValue) ? parsedValue.map(String) : [];
  } catch {
    return [];
  }
}

function writeBookmarkedScenarioIds(storageKey, scenarioIds) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(scenarioIds));
  } catch {
    // Bookmark order is a local preference, so storage failures should not block the page.
  }
}

function compareScenarioTitle(a, b) {
  return String(a.title || '').localeCompare(String(b.title || ''), undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}

function sortSelectedScenarios(a, b, bookmarkedScenarioIds) {
  const aIsBookmarked = bookmarkedScenarioIds.has(String(a.id));
  const bIsBookmarked = bookmarkedScenarioIds.has(String(b.id));

  if (aIsBookmarked !== bIsBookmarked) {
    return aIsBookmarked ? -1 : 1;
  }

  return compareScenarioTitle(a, b);
}

function getFallbackScenario() {
  return mockScenarios.find(scenario => scenario.isSelected) || FALLBACK_SCENARIOS[0];
}

export default function SelectedScenario() {
  const { workshopId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { users: liveSessionUsers } = useWorkshopSessionPresence(workshopId || 1);
  const bookmarkStorageKey = useMemo(() => getBookmarkStorageKey(workshopId || 1), [workshopId]);
  const stateScenarios = useMemo(() => {
    if (Array.isArray(location.state?.scenarios)) {
      return location.state.scenarios;
    }

    if (location.state?.scenario) {
      return [location.state.scenario];
    }

    return [];
  }, [location.state]);
  const [workshop, setWorkshop] = useState(null);
  const [selectedScenarios, setSelectedScenarios] = useState(() => (
    stateScenarios.map(createScenarioViewModel)
  ));
  const [bookmarkedScenarioIdsByKey, setBookmarkedScenarioIdsByKey] = useState(() => ({
    [bookmarkStorageKey]: readBookmarkedScenarioIds(bookmarkStorageKey),
  }));
  const [isLoading, setIsLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  const selectedScenarioIdSet = useMemo(() => (
    new Set(selectedScenarios.map(scenario => String(scenario.id)))
  ), [selectedScenarios]);

  const rawBookmarkedScenarioIds = useMemo(() => {
    const hasStoredBookmarkIds = Object.prototype.hasOwnProperty.call(
      bookmarkedScenarioIdsByKey,
      bookmarkStorageKey,
    );

    return hasStoredBookmarkIds
      ? bookmarkedScenarioIdsByKey[bookmarkStorageKey]
      : readBookmarkedScenarioIds(bookmarkStorageKey);
  }, [bookmarkedScenarioIdsByKey, bookmarkStorageKey]);

  const bookmarkedScenarioIds = useMemo(() => (
    rawBookmarkedScenarioIds.filter(id => selectedScenarioIdSet.has(id))
  ), [rawBookmarkedScenarioIds, selectedScenarioIdSet]);

  useEffect(() => {
    if (isLoading) return;

    writeBookmarkedScenarioIds(bookmarkStorageKey, bookmarkedScenarioIds);
  }, [bookmarkStorageKey, bookmarkedScenarioIds, isLoading]);

  useEffect(() => {
    let isMounted = true;

    async function loadSelectedScenario() {
      setIsLoading(true);

      try {
        const response = await scenariosApi.getByWorkshop(workshopId || 1);
        const apiScenarios = response.data || [];
        const savedScenarios = apiScenarios
          .map(createScenarioViewModel)
          .filter(scenario => scenario.isSelected);

        if (!isMounted) return;
        setSelectedScenarios(savedScenarios.length ? savedScenarios : stateScenarios.map(createScenarioViewModel));
      } catch {
        if (!isMounted) return;
        setSelectedScenarios(
          stateScenarios.length
            ? stateScenarios.map(createScenarioViewModel)
            : [createScenarioViewModel(getFallbackScenario())],
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    async function loadWorkshop() {
      if (!workshopId) return;

      try {
        const response = await workshopsApi.getById(Number(workshopId));
        if (!isMounted) return;
        setWorkshop(response.data);
      } catch (error) {
        if (!isMounted) return;
        
        if (error?.response?.status === 403) {
          setAccessDenied(true);
        } else {
          console.error('Failed to load workshop details.', error);
        }
      }
    }

    loadWorkshop();
    loadSelectedScenario();

    return () => {
      isMounted = false;
    };
  }, [workshopId, stateScenarios]);

  const workshopParticipants = useMemo(() => {
    if (workshop?.participants?.length) {
      return workshop.participants.map(participant => ({
        id: participant.user?.id ?? participant.user?.email,
        name: participant.user?.name || participant.user?.email || 'Participant',
        avatar: participant.user?.avatar || undefined,
      }));
    }

    return [
      { id: 'fallback-0', name: 'Analyst A' },
      { id: 'fallback-1', name: 'Analyst B' },
      { id: 'fallback-2', name: 'Analyst C' },
    ];
  }, [workshop]);
  const visibleWorkshopParticipants = liveSessionUsers.length ? liveSessionUsers : workshopParticipants;

  const bookmarkedScenarioIdSet = useMemo(() => (
    new Set(bookmarkedScenarioIds)
  ), [bookmarkedScenarioIds]);

  const orderedSelectedScenarios = useMemo(() => (
    [...selectedScenarios].sort((a, b) => sortSelectedScenarios(a, b, bookmarkedScenarioIdSet))
  ), [bookmarkedScenarioIdSet, selectedScenarios]);

  function toggleScenarioBookmark(scenario) {
    const scenarioId = String(scenario.id);

    setBookmarkedScenarioIdsByKey(prevBookmarkIdsByKey => {
      const hasStoredBookmarkIds = Object.prototype.hasOwnProperty.call(
        prevBookmarkIdsByKey,
        bookmarkStorageKey,
      );
      const currentIds = hasStoredBookmarkIds
        ? prevBookmarkIdsByKey[bookmarkStorageKey]
        : readBookmarkedScenarioIds(bookmarkStorageKey);
      const activeIds = currentIds.filter(id => selectedScenarioIdSet.has(id));
      const nextIds = activeIds.includes(scenarioId)
        ? activeIds.filter(id => id !== scenarioId)
        : [...activeIds, scenarioId];

      return {
        ...prevBookmarkIdsByKey,
        [bookmarkStorageKey]: nextIds,
      };
    });
  }

  function openSwotAnalysis(scenario) {
    if (!scenario) return;
    navigate(`/workshop/${workshopId || 1}/scenarios/${scenario.id}/swot`);
  }

  if (accessDenied) {
    return (
      <div className="selected-scenario-page">
        <section className="selected-scenario-empty">
          <h2>Access Denied</h2>
          <p>You do not have permission to access this workshop session. Only invited participants can join.</p>
          <Link to="/workshop">
            Back to Workshops
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className="selected-scenario-page">
      <div className="scenario-ref-breadcrumb selected-scenario-breadcrumb">
        <Link to="/workshop">Workshops</Link>
        <span>›</span>
        <Link to={`/workshop/${workshopId || 1}/radar`}>Environmental Scanning</Link>
        <span>›</span>
        <Link to={`/workshop/${workshopId || 1}/scenarios`}>Scenario Generation</Link>
        <span>›</span>
        <span>Selected Scenarios</span>
      </div>

      <header className="selected-scenario-header">
        <div>
          <Link
            to={`/workshop/${workshopId || 1}/scenarios`}
            className="workshop-title-back-link"
          >
            〱 Scenario Generation
          </Link>
          <h1>Selected Scenarios</h1>
          <p>{workshop?.description || 'ประชุมคณะกรรมการบริหารมหาวิทยาลัย (ก.บ.ม.) ประจำปี 2569'}</p>
        </div>

        <div className="selected-scenario-header-actions">
          <WorkshopAvatarStack users={visibleWorkshopParticipants} />
          <span className="selected-scenario-lock-pill">
            <Lock size={15} />
            {selectedScenarios.length} saved & locked
          </span>
        </div>
      </header>

      {isLoading && (
        <div className="selected-scenario-loading" role="status">
          Loading selected scenario...
        </div>
      )}

      {!isLoading && !selectedScenarios.length && (
        <section className="selected-scenario-empty">
          <ShieldCheck size={28} />
          <h2>No selected scenario saved yet</h2>
          <p>Select one recommended scenario and save it before starting SWOT analysis.</p>
          <Link to={`/workshop/${workshopId || 1}/scenarios`}>
            Back to Scenario Generation
          </Link>
        </section>
      )}

      {!isLoading && selectedScenarios.length > 0 && (
        <main className="selected-scenario-layout">
          <div className="selected-scenario-list">
            {orderedSelectedScenarios.map(scenario => {
              const focusClass = getFocusClass(scenario.focus);
              const keyDrivers = scenario.keyDrivers || [];
              const isBookmarked = bookmarkedScenarioIdSet.has(String(scenario.id));

              return (
                <article key={scenario.id} className={`selected-scenario-card ${isBookmarked ? 'bookmarked' : ''}`}>
                  <div className="selected-scenario-body">
                    <div className="selected-scenario-meta-row">
                      <span className={`scenario-ref-focus ${focusClass}`}>
                        {scenario.focus}
                      </span>
                      <span className="selected-scenario-status">
                        <CheckCircle2 size={16} />
                        Saved scenario
                      </span>
                    </div>

                    <div className="selected-scenario-title-row">
                      <h2>{scenario.title}</h2>
                      <button
                        type="button"
                        className={`selected-scenario-bookmark-btn ${isBookmarked ? 'active' : ''}`}
                        aria-pressed={isBookmarked}
                        aria-label={`${isBookmarked ? 'Remove bookmark from' : 'Bookmark'} ${scenario.title}`}
                        title={isBookmarked ? 'Bookmarked' : 'Bookmark scenario'}
                        onClick={() => toggleScenarioBookmark(scenario)}
                      >
                        <Bookmark size={19} fill={isBookmarked ? 'currentColor' : 'none'} />
                      </button>
                    </div>

                    <p>{scenario.description}</p>

                    <div className="selected-scenario-drivers">
                      <span>KEY DRIVERS</span>
                      <div className="scenario-ref-driver-row">
                        {keyDrivers.map(driver => (
                          <small key={driver}>{driver}</small>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="selected-scenario-swot-btn"
                      onClick={() => openSwotAnalysis(scenario)}
                    >
                      SWOT ANALYSIS
                      <ArrowRight size={17} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          <aside className="selected-scenario-side-panel">
            <span className="selected-scenario-side-icon">
              <Lock size={20} />
            </span>
            <h2>Selection Locked</h2>
            <p>
              These saved scenarios are now the only scenarios available for SWOT analysis
              in this workshop.
            </p>

            <div className="selected-scenario-mini-list">
              {orderedSelectedScenarios.map((scenario, index) => (
                <div key={scenario.id}>
                  <span>{index + 1}</span>
                  <strong>{scenario.title}</strong>
                </div>
              ))}
            </div>
          </aside>
        </main>
      )}
    </div>
  );
}
