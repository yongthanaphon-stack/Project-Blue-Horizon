import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Bookmark, TrendingUp, TrendingDown, Lightbulb, AlertTriangle, CheckCircle2, XCircle, Plus, Sparkles } from 'lucide-react';
import { scenariosApi, swotApi } from '../../../api/api';
import { mockScenarios, mockSwot } from '../../../mocks/mockData';
import { createScenarioViewModel, getFocusClass } from '../scenarioData';

const INITIAL_SCENARIO = createScenarioViewModel(mockScenarios[0], 0);
const SWOT_KEYS = ['strengths', 'weaknesses', 'opportunities', 'threats'];

function mergeItems(fallbackItems = [], sourceItems = []) {
  return [...fallbackItems, ...sourceItems].filter((item, index, items) => (
    item && items.indexOf(item) === index
  ));
}

function normalizeSwot(data) {
  const source = data || {};

  return SWOT_KEYS.reduce((normalized, key) => ({
    ...normalized,
    [key]: mergeItems(
      Array.isArray(mockSwot[key]) ? mockSwot[key] : [],
      Array.isArray(source[key]) ? source[key] : [],
    ),
  }), {});
}

export default function SwotAnalysis() {
  const { workshopId, scenarioId } = useParams();
  const [scenario, setScenario] = useState(INITIAL_SCENARIO);
  const [swot, setSwot] = useState(() => normalizeSwot());

  useEffect(() => {
    scenariosApi.getById(scenarioId || 1).then(res => {
      if (res.data) setScenario(createScenarioViewModel(res.data));
    }).catch(err => {
      console.error(err);
      setScenario(createScenarioViewModel(
        mockScenarios.find(item => String(item.id) === String(scenarioId)) || mockScenarios[0],
      ));
    });

    swotApi.getByScenario(scenarioId || 1).then(res => {
      setSwot(normalizeSwot(res.data));
    }).catch(err => {
      console.error(err);
      setSwot(normalizeSwot());
    });
  }, [scenarioId]);
  const [newItems, setNewItems] = useState({ strengths: '', weaknesses: '', opportunities: '', threats: '' });
  const focusClass = getFocusClass(scenario.focus);
  const scenarioDrivers = scenario.keyDrivers || [];
  const swotItems = normalizeSwot(swot);

  function addItem(quadrant) {
    const text = newItems[quadrant].trim();
    if (!text) return;

    const nextSwot = {
      ...swotItems,
      [quadrant]: [...swotItems[quadrant], text],
    };

    setSwot(nextSwot);
    setNewItems(prev => ({ ...prev, [quadrant]: '' }));

    swotApi.update(scenarioId || 1, nextSwot).catch(() => { });
  }

  async function handleSave() {
    try {
      await swotApi.update(scenarioId || 1, swotItems);
      alert('SWOT Analysis saved!');
    } catch {
      alert('Failed to save SWOT Analysis.');
    }
  }

  const quadrants = [
    {
      key: 'strengths', title: 'Strengths', subtitle: 'INTERNAL (+)',
      className: 'swot-strengths', icon: TrendingUp, itemIcon: CheckCircle2,
      color: 'var(--color-success)', placeholder: 'Add strength...',
    },
    {
      key: 'weaknesses', title: 'Weaknesses', subtitle: 'INTERNAL (-)',
      className: 'swot-weaknesses', icon: TrendingDown, itemIcon: XCircle,
      color: 'var(--color-danger)', placeholder: 'Add weakness...',
    },
    {
      key: 'opportunities', title: 'Opportunities', subtitle: 'EXTERNAL (+)',
      className: 'swot-opportunities', icon: Lightbulb, itemIcon: CheckCircle2,
      color: 'var(--color-success)', placeholder: 'Add opportunity...',
    },
    {
      key: 'threats', title: 'Threats', subtitle: 'EXTERNAL (-)',
      className: 'swot-threats', icon: AlertTriangle, itemIcon: XCircle,
      color: 'var(--color-danger)', placeholder: 'Add threat...',
    },
  ];

  return (
    <div className="swot-page">
      {/* Breadcrumb */}
      <div className="breadcrumb mb-2">
        <Link to="/workshop">Workshops</Link>
        <span className="breadcrumb-separator">›</span>
        <Link to={`/workshop/${workshopId || 1}/radar`}>Environmental Scanning</Link>
        <span className="breadcrumb-separator">›</span>
        <Link to={`/workshop/${workshopId || 1}/scenarios`}>Scenario Generation</Link>
        <span className="breadcrumb-separator">›</span>
        <Link to={`/workshop/${workshopId || 1}/scenarios/selected`}>Selected Scenarios</Link>
        <span className="breadcrumb-separator">›</span>
        <span className="active">SWOT analysis</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <Link
            to={`/workshop/${workshopId || 1}/scenarios/selected`}
            className="workshop-title-back-link"
          >
            〱 Selected Scenarios
          </Link>
          <h1>University Executive Meeting</h1>
          <p className="text-muted text-sm">ประชุมคณะกรรมการบริหารมหาวิทยาลัย (ก.บ.ม.) ประจำปี 2569</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="workshop-avatar-stack" style={{ marginRight: 8 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{
                width: 32, height: 32, borderRadius: '50%',
                background: ['#63b3ed', '#f6ad55', '#68d391'][i - 1],
                border: '2px solid white', marginLeft: i > 1 ? -8 : 0,
                position: 'relative', zIndex: 4 - i,
              }} />
            ))}
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'var(--color-gray-200)', border: '2px solid white',
              marginLeft: -8, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.688rem', fontWeight: 600,
            }}>+4</div>
          </div>
        </div>
      </div>

      {/* Selected Scenario Card */}
      <div className="card mb-6 swot-summary-card" style={{ display: 'flex', gap: 0, padding: 0, overflow: 'hidden' }}>
        <div className={`swot-summary-visual ${focusClass}`}>
          <span
            className={`scenario-ref-focus ${focusClass}`}
            style={{ position: 'absolute', top: 16, left: 16 }}
          >
            {scenario.focus}
          </span>
        </div>
        <div className="swot-summary-body">
          <div className="flex items-center justify-between mb-2">
            <h3>{scenario.title}</h3>
            <Bookmark size={18} style={{ color: 'var(--color-gray-400)', cursor: 'pointer' }} />
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-gray-600)', lineHeight: 1.6, marginBottom: 12 }}>
            {scenario.description}
          </p>
          <div className="key-drivers">
            <div className="key-drivers-label">KEY DRIVERS</div>
            <div className="key-drivers-tags">
              {scenarioDrivers.map((d, i) => (
                <span key={i} className="stakeholder-tag">{d}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* SWOT Title */}
      <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 24 }}>SWOT ANALYSIS</h2>

      {/* SWOT Grid */}
      <div className="swot-grid">
        {quadrants.map(q => (
          <div key={q.key} className={`swot-quadrant ${q.className}`}>
            <h3>
              <span className="flex items-center gap-2">
                <q.icon size={20} /> {q.title}
              </span>
              <span style={{ fontSize: '0.688rem', fontWeight: 600, color: 'var(--color-gray-500)' }}>
                {q.subtitle}
              </span>
            </h3>
            {swotItems[q.key].map((item, i) => (
              <div key={i} className="swot-item">
                <q.itemIcon size={16} className="swot-item-icon" style={{ color: q.color }} />
                <span>{item}</span>
              </div>
            ))}
            <div className="swot-add">
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  placeholder={q.placeholder}
                  value={newItems[q.key]}
                  onChange={e => setNewItems(prev => ({ ...prev, [q.key]: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && addItem(q.key)}
                  id={`add-${q.key}-input`}
                  style={{ width: '100%', paddingRight: '40px' }}
                />
                <Sparkles size={14} style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--color-gray-400)',
                  pointerEvents: 'none'
                }} />
              </div>
              <button className="swot-add-btn" onClick={() => addItem(q.key)} id={`add-${q.key}-btn`}>
                <Plus size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Save Button */}
      <div className="swot-save-footer">
        <button
          className="btn btn-primary swot-save-btn"
          onClick={handleSave}
          id="save-swot-btn"
        >
          Save
        </button>
      </div>
    </div>
  );
}
