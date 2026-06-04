import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
  Sparkles,
  Pencil,
  Check,
  X,
} from 'lucide-react';
import { scenariosApi, swotApi, workshopsApi } from '../../../api/api';
import WorkshopAvatarStack from '../../../components/WorkshopAvatarStack';
import { useAlert } from '../../../hooks/useAlert';
import { useAuth } from '../../../hooks/useAuth';
import { useSwotCollaboration, useWorkshopSessionPresence } from '../../../hooks/useRealtimePresence';
import { createScenarioViewModel, getFocusClass } from '../scenarioData';

const INITIAL_SCENARIO = createScenarioViewModel();
const SWOT_KEYS = ['strengths', 'weaknesses', 'opportunities', 'threats'];

function normalizeItems(items = []) {
  return Array.isArray(items)
    ? items.map(item => String(item).trim()).filter(Boolean)
    : [];
}

function normalizeSwot(data) {
  const source = data || {};

  return SWOT_KEYS.reduce((normalized, key) => ({
    ...normalized,
    [key]: normalizeItems(source[key]),
  }), {});
}

export default function SwotAnalysis() {
  const { workshopId, scenarioId } = useParams();
  const { user: currentUser } = useAuth();
  const { showError, showSuccess } = useAlert();
  const typingStopTimerRef = useRef(null);
  const { users: liveSessionUsers } = useWorkshopSessionPresence(workshopId || 1);
  const {
    users: liveSwotUsers,
    activities: swotActivities,
    startActivity,
    stopActivity,
  } = useSwotCollaboration(scenarioId || 1);
  const [workshop, setWorkshop] = useState(null);
  const [scenario, setScenario] = useState(INITIAL_SCENARIO);
  const [swot, setSwot] = useState(() => normalizeSwot());
  const [newItems, setNewItems] = useState({ strengths: '', weaknesses: '', opportunities: '', threats: '' });
  const [editingItem, setEditingItem] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
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

    loadWorkshop();

    scenariosApi.getById(scenarioId || 1).then(res => {
      if (isMounted && res.data) setScenario(createScenarioViewModel(res.data));
    }).catch(err => {
      console.error(err);
      if (isMounted) {
        setScenario(createScenarioViewModel());
      }
    });

    swotApi.getByScenario(scenarioId || 1).then(res => {
      if (isMounted) {
        setSwot(normalizeSwot(res.data));
        setIsDirty(false);
        setSaveStatus('');
      }
    }).catch(err => {
      console.error(err);
      if (isMounted) {
        setSwot(normalizeSwot());
        setIsDirty(false);
        setSaveStatus('');
      }
    });

    return () => {
      isMounted = false;
    };
  }, [scenarioId, workshopId]);

  useEffect(() => () => {
    window.clearTimeout(typingStopTimerRef.current);
  }, []);

  const focusClass = getFocusClass(scenario.focus);
  const scenarioDrivers = scenario.keyDrivers || [];
  const swotItems = normalizeSwot(swot);
  const workshopParticipants = (workshop?.participants || []).length
    ? workshop.participants.map(participant => ({
      id: participant.user?.id ?? participant.user?.email,
      name: participant.user?.name || participant.user?.email || 'Participant',
      avatar: participant.user?.avatar || undefined,
    }))
    : [
      { id: 'fallback-0', name: 'Analyst A' },
      { id: 'fallback-1', name: 'Analyst B' },
      { id: 'fallback-2', name: 'Analyst C' },
    ];
  const visibleWorkshopParticipants = liveSwotUsers.length
    ? liveSwotUsers
    : liveSessionUsers.length
      ? liveSessionUsers
      : workshopParticipants;
  const currentUserId = currentUser?.id ? String(currentUser.id) : null;
  const remoteSwotActivities = swotActivities.filter(activity => (
    String(activity.userId) !== currentUserId
  ));

  function clearTypingStopTimer() {
    window.clearTimeout(typingStopTimerRef.current);
  }

  function scheduleActivityStop() {
    clearTypingStopTimer();
    typingStopTimerRef.current = window.setTimeout(() => {
      stopActivity();
    }, 1800);
  }

  function handleSwotInputFocus(quadrant) {
    clearTypingStopTimer();
    startActivity({ quadrant, mode: 'editing' });
  }

  function handleSwotInputChange(quadrant, value) {
    setNewItems(prev => ({ ...prev, [quadrant]: value }));
    startActivity({ quadrant, mode: 'typing' });
    scheduleActivityStop();
  }

  function handleSwotInputBlur() {
    clearTypingStopTimer();
    stopActivity();
  }

  function addItem(quadrant) {
    const text = newItems[quadrant].trim();
    if (!text) return;

    const nextSwot = {
      ...swotItems,
      [quadrant]: [...swotItems[quadrant], text],
    };

    setSwot(nextSwot);
    setNewItems(prev => ({ ...prev, [quadrant]: '' }));
    setIsDirty(true);
    setSaveStatus('Unsaved changes');
    clearTypingStopTimer();
    stopActivity();
  }

  function startEditItem(quadrant, index, value) {
    clearTypingStopTimer();
    setEditingItem({ quadrant, index, value });
    startActivity({ quadrant, itemIndex: index, mode: 'editing' });
  }

  function updateEditingItem(value) {
    if (!editingItem) return;

    setEditingItem(prev => ({ ...prev, value }));
    startActivity({
      quadrant: editingItem.quadrant,
      itemIndex: editingItem.index,
      mode: 'typing',
    });
    scheduleActivityStop();
  }

  function getSwotWithEditedItem(sourceSwot = swotItems) {
    if (!editingItem) return sourceSwot;

    const text = editingItem.value.trim();
    if (!text) return null;

    return {
      ...sourceSwot,
      [editingItem.quadrant]: sourceSwot[editingItem.quadrant].map((item, index) =>
        index === editingItem.index ? text : item
      ),
    };
  }

  function saveEditedItem() {
    const nextSwot = getSwotWithEditedItem();
    if (!nextSwot) {
      showError('SWOT item cannot be empty.');
      return;
    }

    setSwot(nextSwot);
    setEditingItem(null);
    setIsDirty(true);
    setSaveStatus('Unsaved changes');
    clearTypingStopTimer();
    stopActivity();
  }

  function cancelEditItem() {
    setEditingItem(null);
    clearTypingStopTimer();
    stopActivity();
  }

  async function handleSave() {
    const payload = getSwotWithEditedItem();
    if (!payload) {
      showError('SWOT item cannot be empty.');
      return;
    }

    setIsSaving(true);
    setSaveStatus('Saving...');

    try {
      const response = await swotApi.update(scenarioId || 1, payload);
      setSwot(normalizeSwot(response.data || payload));
      setEditingItem(null);
      setIsDirty(false);
      setSaveStatus('Discussion output ready');
      clearTypingStopTimer();
      stopActivity();
      showSuccess('SWOT analysis saved. Discussion output is ready.');
    } catch (error) {
      const message = error?.response?.data?.message || 'Failed to save SWOT Analysis.';
      setSaveStatus('Save failed');
      showError(message);
    } finally {
      setIsSaving(false);
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

  if (accessDenied) {
    return (
      <div className="swot-page">
        <div className="radar-empty-state exact-radar-empty" style={{ margin: '60px 0' }}>
          <strong>Access Denied</strong>
          <span>You do not have permission to access this workshop session. Only invited participants can join.</span>
          <Link to="/workshop" className="btn btn-primary" style={{ marginTop: '16px' }}>
            Back to Workshops
          </Link>
        </div>
      </div>
    );
  }

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
          <h1>{workshop?.name || 'University Executive Meeting'}</h1>
          <p className="text-muted text-sm">{workshop?.description || 'ประชุมคณะกรรมการบริหารมหาวิทยาลัย (ก.บ.ม.) ประจำปี 2569'}</p>
        </div>
        <div className="flex items-center gap-3">
          {liveSwotUsers.length > 0 && (
            <span className="swot-live-pill">
              <i />
              {liveSwotUsers.length} in SWOT
            </span>
          )}
          <WorkshopAvatarStack users={visibleWorkshopParticipants} />
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
        {quadrants.map(q => {
          const activeCollaborators = remoteSwotActivities.filter(activity => activity.quadrant === q.key);
          const primaryActivity = activeCollaborators[0];

          return (
            <div key={q.key} className={`swot-quadrant ${q.className} ${primaryActivity ? 'remote-active' : ''}`}>
              <h3>
                <span className="flex items-center gap-2">
                  <q.icon size={20} /> {q.title}
                </span>
                <span style={{ fontSize: '0.688rem', fontWeight: 600, color: 'var(--color-gray-500)' }}>
                  {q.subtitle}
                </span>
              </h3>

              {primaryActivity && (
                <div className="swot-collab-indicator">
                  <span>{primaryActivity.name?.slice(0, 2).toUpperCase() || 'BH'}</span>
                  <strong>{primaryActivity.name || 'A teammate'}</strong>
                  <small>{primaryActivity.mode === 'typing' ? 'is commenting...' : 'is editing this quadrant'}</small>
                  {activeCollaborators.length > 1 && <em>+{activeCollaborators.length - 1}</em>}
                </div>
              )}

              {swotItems[q.key].map((item, i) => {
                const isEditing = editingItem?.quadrant === q.key && editingItem?.index === i;

                if (isEditing) {
                  return (
                    <div key={`${q.key}-${i}`} className="swot-item swot-item-editing">
                      <q.itemIcon size={16} className="swot-item-icon" style={{ color: q.color }} />
                      <input
                        value={editingItem.value}
                        onChange={event => updateEditingItem(event.target.value)}
                        onFocus={() => startActivity({ quadrant: q.key, itemIndex: i, mode: 'editing' })}
                        onBlur={scheduleActivityStop}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') saveEditedItem();
                          if (event.key === 'Escape') cancelEditItem();
                        }}
                        aria-label={`Edit ${q.title} item`}
                        autoFocus
                      />
                      <div className="swot-item-actions">
                        <button type="button" onClick={saveEditedItem} aria-label="Save item edit">
                          <Check size={15} />
                        </button>
                        <button type="button" onClick={cancelEditItem} aria-label="Cancel item edit">
                          <X size={15} />
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={`${q.key}-${i}`} className="swot-item">
                    <q.itemIcon size={16} className="swot-item-icon" style={{ color: q.color }} />
                    <span className="swot-item-text">{item}</span>
                    <button
                      type="button"
                      className="swot-item-edit-btn"
                      onClick={() => startEditItem(q.key, i, item)}
                      aria-label={`Edit ${q.title} item`}
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                );
              })}
              <div className="swot-add">
                <div style={{ position: 'relative', flex: 1 }}>
                  <input
                    className={primaryActivity ? 'remote-active' : ''}
                    placeholder={q.placeholder}
                    value={newItems[q.key]}
                    onFocus={() => handleSwotInputFocus(q.key)}
                    onBlur={handleSwotInputBlur}
                    onChange={e => handleSwotInputChange(q.key, e.target.value)}
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
          );
        })}
      </div>

      {/* Save Button */}
      <div className="swot-save-footer">
        {saveStatus && (
          <span className={`swot-save-status ${isDirty ? 'dirty' : ''}`} aria-live="polite">
            {saveStatus}
          </span>
        )}
        <button
          className="btn btn-primary swot-save-btn"
          onClick={handleSave}
          id="save-swot-btn"
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}
