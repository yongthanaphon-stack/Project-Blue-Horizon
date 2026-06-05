import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Search, ZoomIn, ZoomOut, Maximize2, Plus, Trash2, X } from 'lucide-react';
import { workshopsApi } from '../../../api/api';
import WorkshopAvatarStack from '../../../components/WorkshopAvatarStack';
import { useRadarCollaboration, useWorkshopSessionPresence } from '../../../hooks/useRealtimePresence';
import {
  saveRadarSignalsToStorage,
} from '../radarStorage';

const PESTEL_AXES = ['POLITICAL', 'ECONOMIC', 'SOCIAL', 'TECH', 'ENVIRONMENTAL', 'LEGAL'];
const AXIS_ANGLES = PESTEL_AXES.map((_, i) => (i * 360) / 6 - 90);
const SECTOR_BOUNDARY_ANGLES = [0, 60, 120, 180, 240, 300];
const RADAR_LABELS = {
  ENVIRONMENTAL: 'ENVIRON',
};
const CATEGORY_AXIS = {
  POLITICAL: 0,
  ECONOMIC: 1,
  SOCIAL: 2,
  TECHNOLOGICAL: 3,
  TECH: 3,
  ENVIRONMENTAL: 4,
  LEGAL: 5,
};

const PESTEL_OPTIONS = [
  { value: 'POLITICAL', label: 'Political' },
  { value: 'ECONOMIC', label: 'Economic' },
  { value: 'SOCIAL', label: 'Social' },
  { value: 'TECHNOLOGICAL', label: 'Technological' },
  { value: 'ENVIRONMENTAL', label: 'Environmental' },
  { value: 'LEGAL', label: 'Legal' },
];

const HORIZON_OPTIONS = [
  { value: 'H1', label: 'H1', description: '0-2 Years' },
  { value: 'H2', label: 'H2', description: '3-5 Years' },
  { value: 'H3', label: 'H3', description: '5-7 Years' },
];

const HORIZON_RADIUS = {
  H1: 104,
  H2: 152,
  H3: 214,
};

const HORIZON_LABELS = {
  H1: 'H1 (0-2 Years)',
  H2: 'H2 (3-5 Years)',
  H3: 'H3 (5-7 Years)',
};

const HORIZON_DETAILS = {
  H1: 'Near Term',
  H2: 'Medium Term',
  H3: 'Long Term',
};

const PARTICIPANTS = ['analyst-a', 'analyst-b', 'analyst-c'];
const RADAR_ANIMATION_DURATION_MS = 940;
const RADAR_FLOATING_VISIBLE_LIMIT = 5;

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function getCategoryBadgeClass(category) {
  if (category === 'TECHNOLOGICAL' || category === 'TECHNOLOGY') return 'tech';
  if (category === 'ENVIRONMENTAL') return 'enviro';
  return String(category || 'social').toLowerCase();
}

function formatCategoryLabel(category) {
  if (category === 'TECHNOLOGICAL' || category === 'TECHNOLOGY') return 'TECH';
  if (category === 'ENVIRONMENTAL') return 'ENVIRON';
  return String(category || 'SIGNAL');
}

function getPriorityFill(color) {
  if (color === 'high') return '#ef4444';
  if (color === 'medium') return '#eab308';
  return '#22c55e';
}

function getSignalAxisIndex(signal) {
  return CATEGORY_AXIS[signal.category] ?? signal.placement?.axisIndex ?? 0;
}

function getHorizonCode(signal) {
  if (signal.horizonCode) return signal.horizonCode;
  if (signal.horizon?.startsWith('H1')) return 'H1';
  if (signal.horizon?.startsWith('H3')) return 'H3';
  return 'H2';
}

function formatSignalDate(value) {
  if (!value) return 'Not recorded';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not recorded';

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function signalMatchesFilter(signal, filter) {
  const normalizedFilter = filter.trim().toLowerCase();
  if (!normalizedFilter) return true;

  return [
    signal.name,
    signal.description,
    signal.category,
    signal.horizon,
    signal.horizonDetail,
    ...(signal.tags || []),
  ].some(value => String(value || '').toLowerCase().includes(normalizedFilter));
}

function createRadarPlacement(category, horizon, currentCount) {
  const axisIndex = CATEGORY_AXIS[category] ?? 0;
  const angleOffsets = [-18, -9, 0, 9, 18];

  return {
    axisIndex,
    radius: HORIZON_RADIUS[horizon],
    angleOffset: angleOffsets[currentCount % angleOffsets.length],
  };
}

function PriorityMeter({ color, count }) {
  return (
    <div className="priority-dots">
      {Array.from({ length: 3 }, (_, index) => (
        <span
          key={index}
          className={`priority-dot ${index < count ? color : 'muted'}`}
        />
      ))}
    </div>
  );
}

function SignalDetailsPanel({ signal, onClose }) {
  if (!signal) return null;

  const impactLabel = `${signal.dotColor?.toUpperCase() || 'HIGH'} IMPACT`;

  return (
    <aside className="signal-details-panel">
      <div className="signal-details-header">
        <div>
          <p className="signal-details-header-label">Signal Details</p>
          <h2>{signal.name}</h2>
        </div>
        <button
          type="button"
          className="signal-details-close"
          aria-label="Close signal details"
          onClick={onClose}
        >
          <X size={18} strokeWidth={2.2} />
        </button>
      </div>

      <div className="signal-details-card">
        <span className="signal-details-impact-badge">{impactLabel}</span>

        <div className="signal-details-pill-grid">
          <div className="signal-details-pill">
            <span>HORIZON</span>
            <strong>{signal.horizon || 'H2 (3-5 Years)'}</strong>
          </div>
          <div className="signal-details-pill">
            <span>CATEGORY</span>
            <strong>{formatCategoryLabel(signal.category)}</strong>
          </div>
        </div>

        <div className="signal-details-section">
          <p className="section-label">DESCRIPTION</p>
          <p className="signal-details-description">{signal.fullDescription || signal.description}</p>
        </div>

        <div className="signal-details-assessment">
          <div className="assessment-summary">
            <span>Impact Assessment</span>
            <strong>{signal.impactScore?.toFixed(1) || '8.4'} / 10</strong>
          </div>
          <div className="assessment-bar-bg">
            <div className="assessment-bar-fill" style={{ width: `${(signal.impactScore || 8.4) * 10}%` }} />
          </div>
          <div className="assessment-labels">
            <span>LOW</span>
            <span>MEDIUM</span>
            <span>HIGH</span>
          </div>
        </div>

        <div className="signal-details-metadata">
          <div className="metadata-header">
            <span className="info-icon">ⓘ</span>
            <strong>Signal Metadata</strong>
          </div>
          <div className="metadata-row">
            <span>Creation Date</span>
            <strong>{signal.creationDate || formatSignalDate(signal.createdAt)}</strong>
          </div>
          <div className="metadata-row">
            <span>Horizon</span>
            <strong>{signal.horizonDetail || 'Medium Term'}</strong>
          </div>
          <div className="metadata-row">
            <span>Impact Level</span>
            <strong>{signal.impactLevel || 'Regional'}</strong>
          </div>
        </div>
      </div>
    </aside>
  );
}

function RadarChart({ signals, selectedSignalId, zoom, radarAnimation, onSelect }) {
  const cx = 330;
  const cy = 330;
  const outerRadius = 240;
  const midRadius = 176;
  const innerRadius = 126;

  const horizonLabelYOffset = -12;
  const h1Pos = polarToCartesian(cx, cy, innerRadius - 24, 0);
  const h2Pos = polarToCartesian(cx, cy, (innerRadius + midRadius) / 2, 0);
  const h3Pos = polarToCartesian(cx, cy, (midRadius + outerRadius) / 2, 0);

  return (
    <svg viewBox="0 0 660 660" className="environmental-radar-chart" aria-label="Environmental scanning radar">
      <g transform={`translate(${cx} ${cy}) scale(${zoom}) translate(${-cx} ${-cy})`}>
        <circle cx={cx} cy={cy} r={outerRadius} fill="#ffffff" stroke="#eef2f8" strokeWidth={1} />
        <circle cx={cx} cy={cy} r={midRadius} fill="#dfe8f3" stroke="#edf2f7" strokeWidth={1} />
        <circle cx={cx} cy={cy} r={innerRadius} fill="#0f4aa5" stroke="#ffffff" strokeWidth={6} />

        {SECTOR_BOUNDARY_ANGLES.map((angle, i) => {
          const outer = polarToCartesian(cx, cy, outerRadius, angle);

          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={outer.x}
              y2={outer.y}
              stroke="#f7faff"
              strokeWidth={2}
            />
          );
        })}

        <text
          x={h1Pos.x} y={h1Pos.y + horizonLabelYOffset}
          textAnchor="middle" dominantBaseline="middle"
          fill="#ffffff" fontSize="13" fontWeight="600"
        >H1</text>
        <text
          x={h2Pos.x} y={h2Pos.y + horizonLabelYOffset}
          textAnchor="middle" dominantBaseline="middle"
          fill="#355489" fontSize="13" fontWeight="600"
        >H2</text>
        <text
          x={h3Pos.x} y={h3Pos.y + horizonLabelYOffset}
          textAnchor="middle" dominantBaseline="middle"
          fill="#0f172a" fontSize="13" fontWeight="600"
        >H3</text>

        {PESTEL_AXES.map((label, i) => {
          const pos = polarToCartesian(cx, cy, outerRadius + 52, AXIS_ANGLES[i]);

          return (
            <text
              key={label}
              x={pos.x}
              y={pos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#7f8cb0"
              fontSize="12"
              fontWeight="700"
              letterSpacing="2"
            >
              {RADAR_LABELS[label] || label}
            </text>
          );
        })}

        {signals
          .filter(signal => signal.placement)
          .map(signal => {
            const angle = AXIS_ANGLES[getSignalAxisIndex(signal)] + signal.placement.angleOffset;
            const point = polarToCartesian(cx, cy, signal.placement.radius, angle);
            const fill = getPriorityFill(signal.dotColor);
            const isSelected = signal.id === selectedSignalId;
            const activeAnimation = radarAnimation?.signalId === signal.id ? radarAnimation.action : null;
            const nodeClassName = [
              'radar-node',
              isSelected ? 'active' : '',
              activeAnimation ? `radar-node--${activeAnimation}` : '',
            ].filter(Boolean).join(' ');
            const nodeKey = activeAnimation ? `${signal.id}-${radarAnimation.token}` : signal.id;

            return (
              <g
                key={nodeKey}
                className={nodeClassName}
                transform={`translate(${point.x} ${point.y})`}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(signal.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelect(signal.id);
                  }
                }}
              >
                <g className="radar-node-visual">
                  <circle
                    className="radar-node-selection-wave"
                    cx={0}
                    cy={0}
                    r={16}
                    fill="none"
                    stroke={fill}
                    strokeWidth={2}
                  />
                  <circle
                    className="radar-node-halo"
                    cx={0}
                    cy={0}
                    r={20}
                    fill="none"
                    stroke={fill}
                    strokeWidth={2}
                  />
                  <circle
                    className="radar-node-shell"
                    cx={0}
                    cy={0}
                    r={10}
                    fill="#ffffff"
                    stroke="#d7deea"
                    strokeWidth={2}
                  />
                  <circle className="radar-node-core" cx={0} cy={0} r={5} fill={fill} />
                </g>
                <title>{signal.name}</title>
              </g>
            );
          })}
      </g>
    </svg>
  );
}

function AddToRadarModal({ signal, options, isEditing, isSaving, onChange, onClose, onConfirm }) {
  if (!signal) return null;

  const modalTitle = isEditing ? 'Edit Signal on Radar' : 'Add Signal to Radar';
  const confirmLabel = isEditing ? 'Update Radar' : 'Add to Radar';

  return (
    <div className="radar-add-modal-backdrop">
      <div className="radar-add-modal" role="dialog" aria-modal="true" aria-labelledby="radar-add-title">
        <div className="radar-add-modal-header">
          <div>
            <p>{modalTitle}</p>
            <h2 id="radar-add-title">{signal.name}</h2>
          </div>
          <button type="button" className="radar-add-close" onClick={onClose} aria-label="Close radar modal">
            <X size={18} />
          </button>
        </div>

        <div className="radar-add-summary">
          <span className={`badge badge-${getCategoryBadgeClass(signal.category)}`}>
            {formatCategoryLabel(signal.category)}
          </span>
          <p>{signal.description}</p>
        </div>

        <div className="radar-modal-section">
          <label className="form-label">PESTEL Category</label>
          <div className="radar-option-grid pestel">
            {PESTEL_OPTIONS.map(option => (
              <button
                key={option.value}
                type="button"
                className={`radar-option-btn ${options.category === option.value ? 'active' : ''}`}
                onClick={() => onChange('category', option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="radar-modal-section">
          <label className="form-label">Horizon</label>
          <div className="radar-option-grid horizon">
            {HORIZON_OPTIONS.map(option => (
              <button
                key={option.value}
                type="button"
                className={`radar-option-btn ${options.horizon === option.value ? 'active' : ''}`}
                onClick={() => onChange('horizon', option.value)}
              >
                <strong>{option.label}</strong>
                <span>{option.description}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="radar-modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={onConfirm} disabled={isSaving}>
            {isSaving ? 'Saving...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EnvironmentalScan() {
  const { workshopId } = useParams();
  const activeWorkshopId = Number(workshopId || 1);
  const { users: liveSessionUsers } = useWorkshopSessionPresence(activeWorkshopId);
  const [filter, setFilter] = useState('');
  const [selectedSignalId, setSelectedSignalId] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [sourceSignals, setSourceSignals] = useState([]);
  const [radarSignals, setRadarSignals] = useState([]);
  const [selectionLoading, setSelectionLoading] = useState(true);
  const [selectionError, setSelectionError] = useState('');
  const [selectionSavingId, setSelectionSavingId] = useState(null);
  const [signalToAdd, setSignalToAdd] = useState(null);
  const [radarAnimation, setRadarAnimation] = useState(null);
  const [showAllRadarSignals, setShowAllRadarSignals] = useState(false);
  const [addOptions, setAddOptions] = useState({
    category: 'TECHNOLOGICAL',
    horizon: 'H2',
  });
  const [workshop, setWorkshop] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [remoteRadarNotice, setRemoteRadarNotice] = useState(null);

  const handleRemoteRadarUpdate = useCallback((remoteRadarUpdate) => {
    if (!remoteRadarUpdate || !Array.isArray(remoteRadarUpdate.signals)) return;

    const syncedSignals = remoteRadarUpdate.signals;
    saveRadarSignalsToStorage(activeWorkshopId, syncedSignals);
    setRadarSignals(syncedSignals);
    setSelectedSignalId(currentSignalId => {
      if (!currentSignalId) return currentSignalId;

      return syncedSignals.some(signal => signal.id === currentSignalId) ? currentSignalId : null;
    });

    if (remoteRadarUpdate.signalId && remoteRadarUpdate.action !== 'removed') {
      setRadarAnimation({
        signalId: remoteRadarUpdate.signalId,
        action: remoteRadarUpdate.action || 'synced',
        token: `${remoteRadarUpdate.signalId}-${remoteRadarUpdate.receivedAt}`,
      });
    }

    const actionLabel = {
      added: 'added',
      edited: 'updated',
      removed: 'removed',
      synced: 'synced',
    }[remoteRadarUpdate.action] || 'synced';
    const actorName = remoteRadarUpdate.actor?.name || 'A teammate';
    const signalName = remoteRadarUpdate.signalName || 'the radar';

    setRemoteRadarNotice({
      id: `${remoteRadarUpdate.clientMutationId || remoteRadarUpdate.receivedAt}`,
      message: `${actorName} ${actionLabel} ${signalName}`,
    });
  }, [activeWorkshopId]);

  const { sendRadarUpdate } = useRadarCollaboration(
    activeWorkshopId,
    handleRemoteRadarUpdate,
  );

  const workshopParticipants = useMemo(() => {
    if (workshop?.participants?.length) {
      return workshop.participants.map(participant => ({
        id: participant.user?.id ?? participant.user?.email,
        name: participant.user?.name || participant.user?.email || 'Participant',
        avatar: participant.user?.avatar || undefined,
      }));
    }

    return PARTICIPANTS.map((participant, index) => ({
      id: `fallback-${index}`,
      name: participant,
    }));
  }, [workshop]);
  const visibleWorkshopParticipants = liveSessionUsers.length ? liveSessionUsers : workshopParticipants;

  useEffect(() => {
    let isMounted = true;

    async function loadWorkshop() {
      if (!workshopId) return;

      try {
        const response = await workshopsApi.getById(activeWorkshopId);
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

    return () => {
      isMounted = false;
    };
  }, [activeWorkshopId, workshopId]);

  useEffect(() => {
    let isMounted = true;

    async function loadSignalSelection() {
      setSelectionLoading(true);
      setSelectionError('');

      try {
        const response = await workshopsApi.getSignalSelection(activeWorkshopId);
        if (!isMounted) return;

        const availableSignalsFromBank = response.data?.available || [];
        const selectedSignals = response.data?.selected || [];
        const mergedSignals = [...availableSignalsFromBank, ...selectedSignals].reduce((signals, signal) => {
          if (!signals.some(item => item.id === signal.id)) {
            signals.push(signal);
          }

          return signals;
        }, []);

        setSourceSignals(mergedSignals);
        setRadarSignals(selectedSignals);
        saveRadarSignalsToStorage(activeWorkshopId, selectedSignals);
      } catch (error) {
        if (!isMounted) return;

        if (error?.response?.status === 403) {
          setAccessDenied(true);
        } else {
          console.error('Failed to load signal selection.', error);
          setSelectionError('Signal Selection could not load from the Signal Bank.');
        }
      } finally {
        if (isMounted) {
          setSelectionLoading(false);
        }
      }
    }

    loadSignalSelection();

    return () => {
      isMounted = false;
    };
  }, [activeWorkshopId]);

  const selectedSignal = useMemo(
    () => {
      const signalOnRadar = radarSignals.find(signal => signal.id === selectedSignalId);
      if (signalOnRadar) return signalOnRadar;

      return sourceSignals.find(signal => signal.id === selectedSignalId);
    },
    [radarSignals, selectedSignalId, sourceSignals],
  );

  const radarSignalIds = useMemo(
    () => new Set(radarSignals.map(signal => signal.id)),
    [radarSignals],
  );
  const filteredRadarSignals = useMemo(
    () => radarSignals.filter(signal => signalMatchesFilter(signal, filter)),
    [filter, radarSignals],
  );
  const availableSignals = useMemo(
    () => sourceSignals.filter(signal =>
      !radarSignalIds.has(signal.id) && signalMatchesFilter(signal, filter),
    ),
    [filter, radarSignalIds, sourceSignals],
  );
  const visibleRadarSignals = showAllRadarSignals
    ? filteredRadarSignals
    : filteredRadarSignals.slice(0, RADAR_FLOATING_VISIBLE_LIMIT);
  const hiddenRadarSignalCount = Math.max(
    filteredRadarSignals.length - RADAR_FLOATING_VISIBLE_LIMIT,
    0,
  );
  const isEditingRadarSignal = signalToAdd ? radarSignalIds.has(signalToAdd.id) : false;

  useEffect(() => {
    if (!radarAnimation) return undefined;

    const animationTimer = window.setTimeout(() => {
      setRadarAnimation(currentAnimation =>
        currentAnimation?.token === radarAnimation.token ? null : currentAnimation,
      );
    }, RADAR_ANIMATION_DURATION_MS);

    return () => window.clearTimeout(animationTimer);
  }, [radarAnimation]);

  useEffect(() => {
    if (!remoteRadarNotice) return undefined;

    const noticeTimer = window.setTimeout(() => {
      setRemoteRadarNotice(null);
    }, 2600);

    return () => window.clearTimeout(noticeTimer);
  }, [remoteRadarNotice]);

  function handleSelectSignal(id) {
    setSelectedSignalId(id);
  }

  function updateRadarSignals(updater, collaborationMeta = {}) {
    const nextSignals = updater(radarSignals);

    setRadarSignals(nextSignals);
    saveRadarSignalsToStorage(activeWorkshopId, nextSignals);
    sendRadarUpdate({
      signals: nextSignals,
      ...collaborationMeta,
    });
  }

  function openAddSignalModal(signal) {
    const signalOnRadar = radarSignals.find(item => item.id === signal.id);
    const signalForModal = signalOnRadar || signal;

    setSignalToAdd(signalForModal);
    setAddOptions({
      category: signalForModal.category || 'TECHNOLOGICAL',
      horizon: getHorizonCode(signalForModal),
    });
  }

  function closeAddSignalModal() {
    setSignalToAdd(null);
  }

  function updateAddOption(field, value) {
    setAddOptions(prev => ({
      ...prev,
      [field]: value,
    }));
  }

  async function handleConfirmAddToRadar() {
    if (!signalToAdd) return;

    const animationAction = radarSignalIds.has(signalToAdd.id) ? 'edited' : 'added';
    const sameAreaCount = radarSignals.filter(signal => {
      const sameSignal = signal.id === signalToAdd.id;
      const sameCategory = getSignalAxisIndex(signal) === CATEGORY_AXIS[addOptions.category];
      const sameHorizon = signal.placement?.radius === HORIZON_RADIUS[addOptions.horizon];

      return !sameSignal && sameCategory && sameHorizon;
    }).length;
    const placement = createRadarPlacement(addOptions.category, addOptions.horizon, sameAreaCount);

    setSelectionSavingId(signalToAdd.id);

    try {
      const response = await workshopsApi.upsertSignalSelection(
        activeWorkshopId,
        signalToAdd.id,
        {
          category: addOptions.category,
          horizon: addOptions.horizon,
          placement,
        },
      );
      const savedRadarSignal = response.data || {
        ...signalToAdd,
        category: addOptions.category,
        horizon: HORIZON_LABELS[addOptions.horizon],
        horizonCode: addOptions.horizon,
        horizonDetail: HORIZON_DETAILS[addOptions.horizon],
        placement,
      };

      updateRadarSignals(prevSignals => {
        const signalAlreadyExists = prevSignals.some(signal => signal.id === signalToAdd.id);
        if (signalAlreadyExists) {
          return prevSignals.map(signal =>
            signal.id === signalToAdd.id ? savedRadarSignal : signal,
          );
        }

        return [...prevSignals, savedRadarSignal];
      }, {
        action: animationAction,
        signalId: signalToAdd.id,
        signalName: signalToAdd.name,
      });

      setSourceSignals(prevSignals => {
        if (prevSignals.some(signal => signal.id === savedRadarSignal.id)) {
          return prevSignals.map(signal =>
            signal.id === savedRadarSignal.id ? { ...signal, ...savedRadarSignal } : signal,
          );
        }

        return [...prevSignals, savedRadarSignal];
      });
      setSelectedSignalId(signalToAdd.id);
      setRadarAnimation({
        signalId: signalToAdd.id,
        action: animationAction,
        token: `${signalToAdd.id}-${Date.now()}`,
      });
      closeAddSignalModal();
    } catch (error) {
      console.error('Failed to update signal selection.', error);
      alert('Failed to update Signal Selection. Please try again.');
    } finally {
      setSelectionSavingId(null);
    }
  }

  async function removeSignalFromRadar(signalId) {
    const removedSignal = radarSignals.find(signal => signal.id === signalId);

    setSelectionSavingId(signalId);

    try {
      await workshopsApi.removeSignalSelection(activeWorkshopId, signalId);

      updateRadarSignals(prevSignals =>
        prevSignals.filter(signal => signal.id !== signalId),
        {
          action: 'removed',
          signalId,
          signalName: removedSignal?.name,
        },
      );

      if (selectedSignalId === signalId) {
        setSelectedSignalId(null);
      }
    } catch (error) {
      console.error('Failed to remove signal selection.', error);
      alert('Failed to remove signal from Radar. Please try again.');
    } finally {
      setSelectionSavingId(null);
    }
  }

  function handleZoomIn() {
    setZoom(prev => Math.min(1.35, Number((prev + 0.08).toFixed(2))));
  }

  function handleZoomOut() {
    setZoom(prev => Math.max(0.88, Number((prev - 0.08).toFixed(2))));
  }

  function handleResetZoom() {
    setZoom(1);
  }

  if (accessDenied) {
    return (
      <div className="environmental-scan-page exact-environmental-page">
        <div className="exact-environmental-workspace">
          <section className="exact-radar-stage">
            <div className="radar-empty-state exact-radar-empty">
              <strong>Access Denied</strong>
              <span>You do not have permission to access this workshop session. Only invited participants can join.</span>
              <Link to="/workshop" className="btn btn-primary" style={{ marginTop: '16px' }}>
                Back to Workshops
              </Link>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="environmental-scan-page exact-environmental-page">
      <div className="exact-environmental-workspace">
        <aside className="exact-radar-sidebar">
          <div className="exact-sidebar-top">
            <div className="exact-sidebar-header">
              <h2>
                <span>⊕</span>
                Signal Selection
              </h2>
              <span className="badge badge-action">
                {selectionLoading ? 'Loading' : `${availableSignals.length} Ready`}
              </span>
            </div>

            <div className="exact-sidebar-search">
              <Search size={16} />
              <input
                type="text"
                placeholder="Filter signals..."
                value={filter}
                onChange={(event) => {
                  setFilter(event.target.value);
                  setShowAllRadarSignals(false);
                }}
                id="filter-signals"
              />
            </div>
          </div>

          <div className="radar-sidebar-sections">
            <section className="radar-sidebar-section">
              <div className="radar-section-header">
                <div>
                  <p>Signal Selection</p>
                  <h3>Ready to Add</h3>
                </div>
                <span>{selectionLoading ? '...' : availableSignals.length}</span>
              </div>

              <div className="radar-sidebar-list">
                {selectionError && (
                  <div className="radar-empty-state compact">
                    <strong>Signal Bank unavailable</strong>
                    <span>{selectionError}</span>
                  </div>
                )}

                {selectionLoading && (
                  <div className="radar-empty-state compact">
                    <strong>Loading Signal Bank</strong>
                    <span>Preparing signals that can be selected for this workshop.</span>
                  </div>
                )}

                {availableSignals.map(signal => {
                  const isSelected = selectedSignalId === signal.id;
                  const isSavingSignal = selectionSavingId === signal.id;

                  return (
                    <article
                      key={signal.id}
                      className={`signal-selection-card exact-signal-card ${isSelected ? 'active' : ''}`}
                    >
                      <button
                        type="button"
                        className="signal-selection-card-main"
                        onClick={() => handleSelectSignal(signal.id)}
                        aria-pressed={isSelected}
                      >
                        <div className="signal-card-top-row">
                          <span className={`badge badge-${getCategoryBadgeClass(signal.category)}`}>
                            {formatCategoryLabel(signal.category)}
                          </span>
                          <PriorityMeter color={signal.dotColor} count={signal.dotCount} />
                        </div>
                        <h4>{signal.name}</h4>
                        <p>{signal.description}</p>
                      </button>

                      <div className="signal-selection-meta">
                        <span className="signal-added-chip">Ready</span>
                        <button
                          type="button"
                          className="signal-add-btn"
                          onClick={() => openAddSignalModal(signal)}
                          disabled={isSavingSignal}
                        >
                          <Plus size={14} />
                          {isSavingSignal ? 'Adding...' : 'Add to Radar'}
                        </button>
                      </div>
                    </article>
                  );
                })}

                {!selectionLoading && !selectionError && availableSignals.length === 0 && (
                  <div className="radar-empty-state compact">
                    <strong>No signals ready to add</strong>
                    <span>Add published signals in the Signal Bank or remove existing radar items.</span>
                  </div>
                )}
              </div>
            </section>
          </div>
        </aside>

        <section className="exact-radar-stage">
          <div className="breadcrumb exact-radar-breadcrumb">
            <Link to="/workshop">Workshops</Link>
            <span className="breadcrumb-separator">›</span>
            <span className="active">Environmental Scanning</span>
          </div>

          <div className="exact-radar-header">
            <div>
              <Link to="/workshop" className="workshop-title-back-link">
                〱 Workshops
              </Link>
              <h1>{workshop?.name || 'University Executive Meeting'}</h1>
              <p>{workshop?.description || 'ประชุมคณะกรรมการบริหารมหาวิทยาลัย (ก.บ.ม.) ประจำปี 2569'}</p>
            </div>

            <div className="exact-radar-header-actions">
              <WorkshopAvatarStack users={visibleWorkshopParticipants} />

              <Link to={`/workshop/${workshopId || 1}/scenarios`} className="btn btn-primary exact-generate-btn" id="generate-scenario-btn">
                Generate Scenario
              </Link>
            </div>
          </div>

          <div className="exact-radar-canvas">
            {remoteRadarNotice && (
              <div className="radar-sync-toast" role="status">
                <span />
                {remoteRadarNotice.message}
              </div>
            )}

            {radarSignals.length === 0 && (
              <div className="radar-empty-state exact-radar-empty">
                <strong>No signals on radar yet</strong>
                <span>Use Add to Radar from the Signal Selection panel.</span>
              </div>
            )}
            <RadarChart
              signals={radarSignals}
              selectedSignalId={selectedSignalId}
              zoom={zoom}
              radarAnimation={radarAnimation}
              onSelect={handleSelectSignal}
            />

            {radarSignals.length > 0 && (
              <aside className="radar-floating-list" aria-label="Signals already on radar">
                <div className="radar-floating-header">
                  <div>
                    <p>Current Radar</p>
                    <h3>On Radar</h3>
                  </div>
                  <span>{filteredRadarSignals.length}</span>
                </div>

                <div className="radar-floating-items">
                  {visibleRadarSignals.map(signal => {
                    const isSelected = selectedSignalId === signal.id;
                    const isSavingSignal = selectionSavingId === signal.id;
                    const cardAnimation = radarAnimation?.signalId === signal.id ? radarAnimation.action : null;
                    const cardClassName = [
                      'radar-floating-card',
                      isSelected ? 'active' : '',
                      cardAnimation ? `radar-card--${cardAnimation}` : '',
                    ].filter(Boolean).join(' ');

                    return (
                      <article key={signal.id} className={cardClassName}>
                        <button
                          type="button"
                          className="radar-floating-card-main"
                          onClick={() => handleSelectSignal(signal.id)}
                          aria-pressed={isSelected}
                        >
                          <span className={`priority-dot ${signal.dotColor}`}></span>
                          <span className="radar-floating-name">{signal.name}</span>
                          <span className="radar-floating-horizon">{getHorizonCode(signal)}</span>
                        </button>

                        <div className="radar-floating-actions">
                          <button
                            type="button"
                            className="radar-floating-action-btn"
                            onClick={() => openAddSignalModal(signal)}
                            disabled={isSavingSignal}
                          >
                            {isSavingSignal ? 'Saving' : 'Edit'}
                          </button>
                          <button
                            type="button"
                            className="radar-floating-remove-btn"
                            onClick={() => removeSignalFromRadar(signal.id)}
                            aria-label={`Remove ${signal.name} from radar`}
                            title="Remove from Radar"
                            disabled={isSavingSignal}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </article>
                    );
                  })}

                  {hiddenRadarSignalCount > 0 && (
                    <button
                      type="button"
                      className="radar-floating-more-btn"
                      onClick={() => setShowAllRadarSignals(prev => !prev)}
                      aria-expanded={showAllRadarSignals}
                    >
                      {showAllRadarSignals ? 'Show less' : `More +${hiddenRadarSignalCount}`}
                    </button>
                  )}

                  {filteredRadarSignals.length === 0 && (
                    <div className="radar-empty-state compact radar-floating-empty">
                      <strong>No radar items match</strong>
                      <span>Try another keyword.</span>
                    </div>
                  )}
                </div>
              </aside>
            )}

            {selectedSignal && (
              <SignalDetailsPanel
                signal={selectedSignal}
                onClose={() => setSelectedSignalId(null)}
              />
            )}
          </div>
        </section>
      </div>

      {signalToAdd && (
        <AddToRadarModal
          signal={signalToAdd}
          options={addOptions}
          isEditing={isEditingRadarSignal}
          isSaving={selectionSavingId === signalToAdd.id}
          onChange={updateAddOption}
          onClose={closeAddSignalModal}
          onConfirm={handleConfirmAddToRadar}
        />
      )}

      <div className="workshop-bottom-toolbar exact-radar-footer">
        <div className="exact-radar-legend">
          <span className="exact-radar-label">PRIORITY:</span>
          <span className="exact-radar-item"><span className="priority-dot high"></span> High</span>
          <span className="exact-radar-item"><span className="priority-dot medium"></span> Medium</span>
          <span className="exact-radar-item"><span className="priority-dot low"></span> Low</span>
          <span className="exact-radar-label action">ACTION:</span>
          <span className="exact-radar-note">Add from Ready to Add; existing radar items sit in the soft panel at top right</span>
        </div>
        <div className="exact-radar-zoom">
          <button className="btn btn-outline btn-sm exact-zoom-btn" type="button" onClick={handleZoomIn} aria-label="Zoom in"><ZoomIn size={14} /></button>
          <button className="btn btn-outline btn-sm exact-zoom-btn" type="button" onClick={handleZoomOut} aria-label="Zoom out"><ZoomOut size={14} /></button>
          <button className="btn btn-outline btn-sm exact-zoom-btn" type="button" onClick={handleResetZoom} aria-label="Reset zoom"><Maximize2 size={14} /></button>
        </div>
      </div>
    </div>
  );
}
