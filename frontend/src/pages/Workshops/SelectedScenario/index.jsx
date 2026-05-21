import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Bookmark, CheckCircle2, Lock, ShieldCheck } from 'lucide-react';
import { scenariosApi } from '../../../api/api';
import { mockScenarios } from '../../../mocks/mockData';
import { FALLBACK_SCENARIOS, createScenarioViewModel, getFocusClass } from '../scenarioData';

function AvatarStack() {
  return (
    <div className="scenario-ref-avatar-stack" aria-label="Workshop collaborators">
      {['analyst-a', 'analyst-b', 'analyst-c'].map((participant, index) => (
        <span
          key={participant}
          className={`workshop-avatar-chip ${participant}`}
          style={{ marginLeft: index > 0 ? -8 : 0, zIndex: 4 - index }}
        />
      ))}
      <span className="scenario-ref-avatar-more">+4</span>
    </div>
  );
}

function getFallbackScenario() {
  return mockScenarios.find(scenario => scenario.isSelected) || FALLBACK_SCENARIOS[0];
}

export default function SelectedScenario() {
  const { workshopId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const stateScenarios = useMemo(() => {
    if (Array.isArray(location.state?.scenarios)) {
      return location.state.scenarios;
    }

    if (location.state?.scenario) {
      return [location.state.scenario];
    }

    return [];
  }, [location.state]);
  const [selectedScenarios, setSelectedScenarios] = useState(() => (
    stateScenarios.map(createScenarioViewModel)
  ));
  const [isLoading, setIsLoading] = useState(true);

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

    loadSelectedScenario();

    return () => {
      isMounted = false;
    };
  }, [workshopId, stateScenarios]);

  function openSwotAnalysis(scenario) {
    if (!scenario) return;
    navigate(`/workshop/${workshopId || 1}/scenarios/${scenario.id}/swot`);
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
          <p>ประชุมคณะกรรมการบริหารมหาวิทยาลัย (ก.บ.ม.) ประจำปี 2569</p>
        </div>

        <div className="selected-scenario-header-actions">
          <AvatarStack />
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
            {selectedScenarios.map(scenario => {
              const focusClass = getFocusClass(scenario.focus);
              const keyDrivers = scenario.keyDrivers || [];

              return (
                <article key={scenario.id} className="selected-scenario-card">
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
                      <Bookmark size={20} />
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
              {selectedScenarios.map((scenario, index) => (
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
