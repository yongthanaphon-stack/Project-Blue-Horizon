import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  Bookmark,
  Check,
  CheckCircle2,
  FolderPlus,
  Layers3,
  Lock,
  Maximize2,
  Plus,
  Save,
  Share2,
  Users,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { scenariosApi, workshopsApi } from '../../../api/api';
import WorkshopAvatarStack from '../../../components/WorkshopAvatarStack';
import { useAuth } from '../../../hooks/useAuth';
import { mockScenarios } from '../../../mocks/mockData';
import { FALLBACK_SCENARIOS, createScenarioViewModel, getFocusClass } from '../scenarioData';

const ALTERNATIVE_VARIATIONS = [
  {
    category: 'TECHNOLOGY',
    tone: 'technology',
    title: 'Graphene-based Supercapacitors',
    description: 'Breakthrough in energy density and charge speeds.',
    priority: ['high', 'high', 'high'],
  },
  {
    category: 'ECONOMIC',
    tone: 'economic',
    title: 'Peer-to-Peer Energy Trading',
    description: 'Localized microgrids bypassing traditional utilities.',
    priority: ['medium', 'medium', 'muted'],
  },
  {
    category: 'ENVIRONMENTAL',
    tone: 'environmental',
    title: 'Ocean Thermal Conversion',
    description: 'Harnessing temperature gradients for baseload power.',
    priority: ['low', 'muted', 'muted'],
  },
  {
    category: 'SOCIAL',
    tone: 'social',
    title: 'Decentralized Autonomous Power Co-ops',
    description: 'Community-owned energy systems via DAO governance.',
    priority: ['high', 'high', 'muted'],
  },
];

const fallbackScenarioParticipants = [
  { id: 'fallback-0', name: 'Analyst A' },
  { id: 'fallback-1', name: 'Analyst B' },
  { id: 'fallback-2', name: 'Analyst C' },
];

function SelectedScenarioBox({ scenarios, onRemoveScenario, isLocked }) {
  if (!scenarios.length) {
    return null;
  }

  return (
    <div className="scenario-ref-selected-list">
      {scenarios.map(scenario => {
        const focusClass = getFocusClass(scenario.focus);

        return (
          <article
            key={scenario.id}
            className={`scenario-ref-selected swot-target ${isLocked ? 'locked' : ''}`}
            aria-label={`${scenario.title} is ${isLocked ? 'saved and locked' : 'in the selected scenario set'}`}
          >
            <div className="scenario-ref-selected-body">
              <div className="scenario-ref-selected-top">
                <span className={`scenario-ref-focus ${focusClass}`}>
                  {scenario.focus}
                </span>
                <span className="scenario-ref-selected-check swot-target">
                  {isLocked ? <Lock size={15} /> : <CheckCircle2 size={16} />}
                  {isLocked ? 'Saved' : 'In set'}
                </span>
              </div>
              <h3>{scenario.title}</h3>
              <p>{scenario.description}</p>
              <div className="scenario-ref-driver-row">
                {scenario.keyDrivers.map(driver => (
                  <span key={driver}>{driver}</span>
                ))}
              </div>
              {isLocked ? (
                <span className="scenario-ref-target-btn active locked">
                  <Lock size={16} />
                  Saved to set
                </span>
              ) : (
                <button
                  type="button"
                  className="scenario-ref-target-btn remove"
                  onClick={(event) => {
                    event.stopPropagation();
                    onRemoveScenario(scenario);
                  }}
                >
                  <X size={16} />
                  Remove
                </button>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function ScenarioCard({ scenario, isSelected, isLocked, onToggle, onDetail }) {
  const focusClass = getFocusClass(scenario.focus);

  function handleCardKeyDown(event) {
    if (isLocked || event.target !== event.currentTarget) return;

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onToggle(scenario);
    }
  }

  function handleBookmarkClick(event) {
    event.stopPropagation();
  }

  function handleDetailClick(event) {
    event.stopPropagation();
    onDetail(scenario);
  }

  function handleSelectionClick(event) {
    event.stopPropagation();

    if (!isLocked) {
      onToggle(scenario);
    }
  }

  return (
    <article
      className={`scenario-ref-card ${isSelected ? 'selected' : ''} ${isLocked ? 'selection-locked' : ''}`}
      role={isLocked ? undefined : 'button'}
      tabIndex={isLocked ? -1 : 0}
      aria-pressed={isLocked ? undefined : isSelected}
      onClick={isLocked ? undefined : () => onToggle(scenario)}
      onKeyDown={isLocked ? undefined : handleCardKeyDown}
    >
      <div className="scenario-ref-card-body">
        <div className="scenario-ref-card-status-row">
          <span className={`scenario-ref-focus ${focusClass}`}>
            {scenario.focus}
          </span>
          <button
            type="button"
            className={`scenario-ref-card-check ${isSelected ? 'selected' : ''}`}
            aria-pressed={isSelected}
            aria-label={`${isSelected ? 'Unselect' : 'Select'} ${scenario.title}`}
            disabled={isLocked}
            onClick={handleSelectionClick}
          >
            {isSelected && <Check size={18} strokeWidth={3} />}
          </button>
        </div>

        <div className="scenario-ref-card-title-row">
          <h3>{scenario.title}</h3>
          <button type="button" aria-label={`Bookmark ${scenario.title}`} onClick={handleBookmarkClick}>
            <Bookmark size={20} />
          </button>
        </div>

        <p>{scenario.description}</p>

        <div className="scenario-ref-drivers">
          <span>KEY DRIVERS</span>
          <div className="scenario-ref-driver-row">
            {scenario.keyDrivers.map(driver => (
              <small key={driver}>{driver}</small>
            ))}
          </div>
        </div>

        <button
          type="button"
          className="scenario-ref-detail-btn"
          onClick={handleDetailClick}
        >
          Detail
        </button>
      </div>
    </article>
  );
}

function SaveScenarioDialog({ scenarios, isSaving, onCancel, onConfirm }) {
  if (!scenarios.length) return null;

  function handleBackdropMouseDown(event) {
    if (event.target === event.currentTarget && !isSaving) {
      onCancel();
    }
  }

  return (
    <div
      className="scenario-save-modal-backdrop"
      role="presentation"
      onMouseDown={handleBackdropMouseDown}
    >
      <section
        className="scenario-save-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="scenario-save-title"
      >
        <span className="scenario-save-modal-icon" aria-hidden="true">
          <AlertTriangle size={24} />
        </span>

        <div>
          <span className="scenario-save-modal-kicker">Final selection</span>
          <h2 id="scenario-save-title">Save selected scenarios?</h2>
          <p>
            After saving, this workshop will use these scenarios for SWOT analysis.
            You will not be able to go back to edit the selection or choose another scenario.
          </p>
        </div>

        <div className="scenario-save-modal-scenario">
          <span className="scenario-save-modal-count">
            {scenarios.length} scenario{scenarios.length > 1 ? 's' : ''} selected
          </span>
          {scenarios.map(scenario => (
            <div key={scenario.id} className="scenario-save-modal-item">
              <span className={`scenario-ref-focus ${getFocusClass(scenario.focus)}`}>
                {scenario.focus}
              </span>
              <strong>{scenario.title}</strong>
            </div>
          ))}
        </div>

        <footer className="scenario-save-modal-actions">
          <button type="button" className="scenario-save-cancel" onClick={onCancel} disabled={isSaving}>
            Cancel
          </button>
          <button type="button" className="scenario-save-confirm" onClick={onConfirm} disabled={isSaving}>
            <Save size={17} />
            {isSaving ? 'Saving...' : 'Save and lock'}
          </button>
        </footer>
      </section>
    </div>
  );
}

function VariationPriorityDots({ priority }) {
  return (
    <div className="scenario-result-priority-dots" aria-label="Variation priority">
      {priority.map((level, index) => (
        <span key={`${level}-${index}`} className={level} />
      ))}
    </div>
  );
}

function ScenarioDetailPage({ scenario, onBack }) {
  const signalChips = scenario.relatedSignals || [];
  const mainDriver = scenario.keyDrivers[0] || 'regional transformation signals';
  const secondDriver = scenario.keyDrivers[1] || 'institutional readiness';

  return (
    <div className="scenario-result-page">
      <div className="scenario-result-breadcrumb">
        <span>Projects</span>
        <span>›</span>
        <span>Blue Horizon</span>
        <span>›</span>
        <strong>Scenario Generation</strong>
      </div>

      <header className="scenario-result-header">
        <div>
          <h1>Scenario Results: Blue Horizon</h1>
          <p>
            Projected variations of potential future states for Strategy Planning 2025,
            synthesized from 124 global market signals.
          </p>
        </div>

        <button type="button" className="scenario-result-back" onClick={onBack}>
          Back
        </button>
      </header>

      <div className="scenario-result-layout">
        <article className="scenario-result-main-card">
          <div className="scenario-result-hero">
            <div className="scenario-result-badges">
              <span>HIGH PROBABILITY</span>
              <span>2025 Q3 MILESTONE</span>
            </div>

            <div className="scenario-result-hero-icon" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
              <i />
            </div>
          </div>

          <div className="scenario-result-body">
            <div className="scenario-result-title-row">
              <h2>{scenario.resultTitle}</h2>
              <div>
                <button type="button" aria-label="Bookmark scenario result">
                  <Bookmark size={21} />
                </button>
                <button type="button" aria-label="Share scenario result">
                  <Share2 size={21} />
                </button>
              </div>
            </div>

            <p>
              In this scenario, we anticipate a massive shift toward localized production
              and decentralized energy grids. Driven by the recent surges in{' '}
              <strong>{mainDriver}</strong> and <strong>{secondDriver}</strong>, the market
              fragments into high-efficiency clusters.
            </p>

            <p>
              Strategic implications suggest that centralized logistics will face significant
              pressure, while hyper-local distribution networks will see a 40% valuation
              increase over the next 18 months. This represents our most favorable outcome
              for the "Blue Horizon" initiative.
            </p>

            <div className="scenario-result-related">
              <h3>RELATED SIGNALS</h3>
              <div>
                {signalChips.map(signal => (
                  <span key={signal}>{signal}</span>
                ))}
                <span>+12 more</span>
              </div>
            </div>
          </div>

          <footer className="scenario-result-footer">
            <span>
              <Users size={18} />
              Collaborators: 4 Analysts active
            </span>
            <button type="button">View Detailed Impact Report</button>
          </footer>
        </article>

        <aside className="scenario-result-sidebar">
          <h2>Alternative Variations</h2>

          <div className="scenario-result-variation-list">
            {ALTERNATIVE_VARIATIONS.map(variation => (
              <article key={variation.title} className="scenario-result-variation-card">
                <div>
                  <span className={`scenario-result-category ${variation.tone}`}>
                    {variation.category}
                  </span>
                  <h3>{variation.title}</h3>
                  <p>{variation.description}</p>
                </div>
                <VariationPriorityDots priority={variation.priority} />
              </article>
            ))}

            <button type="button" className="scenario-result-generate">
              <Plus size={19} />
              GENERATE NEW VARIATION
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function ScenarioGeneration() {
  const { workshopId } = useParams();
  const navigate = useNavigate();
  const { canViewAdmin } = useAuth();
  const [workshop, setWorkshop] = useState(null);
  const [scenarios, setScenarios] = useState([]);
  const [selectedScenarios, setSelectedScenarios] = useState([]);
  const [isSavingScenario, setIsSavingScenario] = useState(false);
  const [isScenarioLocked, setIsScenarioLocked] = useState(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [detailScenario, setDetailScenario] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    let isMounted = true;

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

    async function loadScenarios() {
      try {
        const response = await scenariosApi.getByWorkshop(workshopId || 1);
        const apiScenarios = response.data || [];
        const sourceScenarios = apiScenarios.length ? apiScenarios : FALLBACK_SCENARIOS;

        if (!isMounted) return;
        setScenarios(sourceScenarios.map(createScenarioViewModel));
        setSelectedScenarios([]);
        setIsScenarioLocked(false);
        setIsSaveDialogOpen(false);
        setDetailScenario(null);
      } catch {
        if (!isMounted) return;
        const fallbackSource = mockScenarios.length ? mockScenarios : FALLBACK_SCENARIOS;
        setScenarios(fallbackSource.map(createScenarioViewModel));
        setSelectedScenarios([]);
        setIsScenarioLocked(false);
        setIsSaveDialogOpen(false);
        setDetailScenario(null);
      }
    }

    loadWorkshop();
    loadScenarios();

    return () => {
      isMounted = false;
    };
  }, [workshopId]);

  const workshopParticipants = useMemo(() => {
    if (workshop?.participants?.length) {
      return workshop.participants.map(participant => ({
        id: participant.user?.id ?? participant.user?.email,
        name: participant.user?.name || participant.user?.email || 'Participant',
        avatar: participant.user?.avatar || undefined,
      }));
    }

    return fallbackScenarioParticipants;
  }, [workshop]);

  function isScenarioSelected(scenario) {
    return selectedScenarios.some(selected => String(selected.id) === String(scenario.id));
  }

  function toggleScenarioSelection(scenario) {
    if (isSelectionLockedForUser) return;

    const alreadySelected = isScenarioSelected(scenario);

    if (alreadySelected) {
      setSelectedScenarios(prevSelected => prevSelected.filter(
        selected => String(selected.id) !== String(scenario.id),
      ));
      return;
    }

    setSelectedScenarios(prevSelected => [...prevSelected, scenario]);
  }

  function removeScenarioFromSet(scenario) {
    if (isSelectionLockedForUser) return;

    setSelectedScenarios(prevSelected => prevSelected.filter(
      selected => String(selected.id) !== String(scenario.id),
    ));
  }

  function openSavedScenarioPage(scenariosToOpen = selectedScenarios) {
    if (!scenariosToOpen.length) return;

    navigate(`/workshop/${workshopId || 1}/scenarios/selected`, {
      state: { scenarios: scenariosToOpen },
    });
  }

  function openSaveWarning() {
    if (isSelectionLockedForUser) {
      openSavedScenarioPage();
      return;
    }

    if (!canSaveScenario) return;

    setIsSaveDialogOpen(true);
  }

  function scrollToScenarioRecommendations() {
    document
      .getElementById('scenario-recommendations')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function saveSelectedScenario() {
    if (!canSaveScenario) return;

    setIsSavingScenario(true);

    const numericScenarioIds = selectedScenarios.map(scenario => Number(scenario.id));
    const numericWorkshopId = Number(workshopId || 1);
    const canPersistSelection = Number.isInteger(numericWorkshopId)
      && numericScenarioIds.every(Number.isInteger);

    let didSave = false;

    try {
      if (canPersistSelection) {
        await scenariosApi.selectMany(numericWorkshopId, numericScenarioIds);
      }
      didSave = true;
    } catch (error) {
      if (!canPersistSelection || error?.response?.status !== 403) {
        didSave = true;
      }
    } finally {
      setIsSavingScenario(false);
      setIsSaveDialogOpen(false);

      if (didSave) {
        setIsScenarioLocked(true);
        openSavedScenarioPage(selectedScenarios);
      }
    }
  }

  const selectedScenarioCount = selectedScenarios.length;
  const isSelectionLockedForUser = isScenarioLocked && !canViewAdmin;
  const canSaveScenario = selectedScenarioCount > 0 && !isSavingScenario;
  const canUseHeaderAction = isSelectionLockedForUser ? selectedScenarioCount > 0 : canSaveScenario;
  const actionCount = Math.max(4, scenarios.length);
  let headerActionLabel = 'SAVE';
  let headerActionAriaLabel = 'Select one scenario before saving';

  if (isSelectionLockedForUser) {
    headerActionLabel = 'VIEW SAVED';
    headerActionAriaLabel = 'View saved scenario';
  } else if (isSavingScenario) {
    headerActionLabel = 'SAVING...';
    headerActionAriaLabel = 'Saving selected scenario';
  } else if (canSaveScenario) {
    headerActionLabel = isScenarioLocked
      ? `UPDATE (${selectedScenarioCount})`
      : `SAVE (${selectedScenarioCount})`;
    headerActionAriaLabel = `Save ${selectedScenarioCount} selected scenarios`;
  }

  if (accessDenied) {
    return (
      <div className="scenario-ref-page">
        <div className="scenario-ref-content">
          <section className="radar-empty-state exact-radar-empty" style={{ margin: '60px 0' }}>
            <strong>Access Denied</strong>
            <span>You do not have permission to access this workshop session. Only invited participants can join.</span>
            <Link to="/workshop" className="btn btn-primary" style={{ marginTop: '16px' }}>
              Back to Workshops
            </Link>
          </section>
        </div>
      </div>
    );
  }

  if (detailScenario) {
    return <ScenarioDetailPage scenario={detailScenario} onBack={() => setDetailScenario(null)} />;
  }

  return (
    <div className="scenario-ref-page">
      <div className="scenario-ref-content">
        <div className="scenario-ref-breadcrumb">
          <Link to="/workshop">Workshops</Link>
          <span>›</span>
          <Link to={`/workshop/${workshopId || 1}/radar`}>Environmental Scanning</Link>
          <span>›</span>
          <span>Scenario Generation</span>
        </div>

        <header className="scenario-ref-header">
          <div>
            <Link
              to={`/workshop/${workshopId || 1}/radar`}
              className="workshop-title-back-link"
            >
              〱 Environmental Scanning
            </Link>
            <h1>{workshop?.name || 'University Executive Meeting'}</h1>
            <p>{workshop?.description || 'ประชุมคณะกรรมการบริหารมหาวิทยาลัย (ก.บ.ม.) ประจำปี 2569'}</p>
          </div>

          <div className="scenario-ref-header-actions">
            <WorkshopAvatarStack users={workshopParticipants} />
            <button
              type="button"
              className={`scenario-ref-swot-btn ${canUseHeaderAction ? '' : 'disabled'}`}
              id="save-scenario-btn"
              disabled={!canUseHeaderAction}
              aria-label={headerActionAriaLabel}
              onClick={openSaveWarning}
            >
              {headerActionLabel}
            </button>
          </div>
        </header>

        <main className="scenario-ref-main-layout">
          <section className="scenario-ref-recommend-section" id="scenario-recommendations">
            <div className="scenario-ref-section-title">
              <h2>Recommend Scenario</h2>
              <span>{isSelectionLockedForUser ? 'LOCKED' : `${actionCount} ACTION REQUIRED`}</span>
            </div>

            <div className="scenario-ref-grid">
              {scenarios.map(scenario => (
                <ScenarioCard
                  key={scenario.id}
                  scenario={scenario}
                  isSelected={isScenarioSelected(scenario)}
                  isLocked={isSelectionLockedForUser}
                  onToggle={toggleScenarioSelection}
                  onDetail={setDetailScenario}
                />
              ))}
            </div>
          </section>

          <aside className="scenario-ref-selected-section">
            <div className="scenario-ref-selected-head">
              <div className="scenario-ref-selected-heading">
                <h2>Selected Scenarios</h2>
              </div>

              <div
                className={`scenario-ref-selection-action ${selectedScenarioCount ? 'active' : ''} ${isSelectionLockedForUser ? 'disabled' : ''}`}
              >
                {isSelectionLockedForUser
                  ? <Lock size={16} />
                  : selectedScenarioCount
                    ? <Layers3 size={16} />
                    : <FolderPlus size={16} />}
                <span>
                  {isSelectionLockedForUser
                    ? 'Selection locked'
                    : selectedScenarioCount
                      ? `${selectedScenarioCount} in scenario set`
                      : 'Add scenarios to set'}
                </span>
              </div>
            </div>
            <SelectedScenarioBox
              scenarios={selectedScenarios}
              onRemoveScenario={removeScenarioFromSet}
              isLocked={isSelectionLockedForUser}
            />
          </aside>
        </main>
      </div>

      <div className="scenario-ref-bottom-toolbar">
        <div className="scenario-ref-toolbar-left">
          <span className="scenario-ref-toolbar-label">PRIORITY:</span>
          <span><i className="high" />High</span>
          <span><i className="medium" />Medium</span>
          <span><i className="low" />Low</span>
          <span className="scenario-ref-toolbar-label action">ACTION:</span>
          <span>Drag signals from sidebar to place on</span>
        </div>

        <div className="scenario-ref-zoom">
          <button type="button" aria-label="Zoom in"><ZoomIn size={15} /></button>
          <button type="button" aria-label="Zoom out"><ZoomOut size={15} /></button>
          <button type="button" aria-label="Reset zoom"><Maximize2 size={15} /></button>
        </div>
      </div>

      {isSaveDialogOpen && (
        <SaveScenarioDialog
          scenarios={selectedScenarios}
          isSaving={isSavingScenario}
          onCancel={() => setIsSaveDialogOpen(false)}
          onConfirm={saveSelectedScenario}
        />
      )}
    </div>
  );
}
