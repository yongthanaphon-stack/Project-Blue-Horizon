import { createElement, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CalendarClock,
  Database,
  Download,
  FileText,
  Gauge,
  Globe2,
  RefreshCw,
  ShieldCheck,
  ThumbsUp,
  TrendingUp,
  Users,
} from 'lucide-react';
import { signalsApi, workshopsApi } from '../../../api/api';
import './Dashboard.css';

const PESTEL_META = {
  POLITICAL: { label: 'Political', className: 'political' },
  ECONOMIC: { label: 'Economic', className: 'economic' },
  SOCIAL: { label: 'Social', className: 'social' },
  TECHNOLOGICAL: { label: 'Tech', className: 'tech' },
  ENVIRONMENTAL: { label: 'Environmental', className: 'environmental' },
  LEGAL: { label: 'Legal', className: 'legal' },
};

const PROGRESS_SCALE_BASE = 24;
const MIN_VISIBLE_PROGRESS = 4;
const TIMEFRAME_DAYS = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

function csvCell(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function downloadCsv(filename, rows) {
  const csv = rows.map(row => row.map(csvCell).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function getImpactLevel(score = 0) {
  if (score >= 7) return 'high';
  if (score >= 4) return 'medium';
  return 'low';
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

function getProgressFillWidth(value, total = PROGRESS_SCALE_BASE) {
  if (!value) return 0;
  const scaleBase = Math.max(total, PROGRESS_SCALE_BASE);
  return Math.min(100, Math.max(MIN_VISIBLE_PROGRESS, Math.round((value / scaleBase) * 100)));
}

function getDateValue(item, fields) {
  const rawValue = fields.map(field => item?.[field]).find(Boolean);
  if (!rawValue) return null;

  const date = new Date(rawValue);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isWithinTimeframe(item, fields, timeframe) {
  const days = TIMEFRAME_DAYS[timeframe] || TIMEFRAME_DAYS['30d'];
  const date = getDateValue(item, fields);
  if (!date) return false;

  return date.getTime() >= Date.now() - days * 24 * 60 * 60 * 1000;
}

function StatTile({ icon, label, value, detail, tone = 'primary' }) {
  return (
    <div className={`dashboard-stat dashboard-stat-${tone}`}>
      <div className="dashboard-stat-icon">
        {createElement(icon, { size: 20 })}
      </div>
      <div>
        <div className="dashboard-stat-label">{label}</div>
        <div className="dashboard-stat-value">{value}</div>
        <div className="dashboard-stat-detail">{detail}</div>
      </div>
    </div>
  );
}

function Panel({ title, icon, action, children }) {
  return (
    <section className="dashboard-panel">
      <div className="dashboard-panel-header">
        <div className="dashboard-panel-title">
          {createElement(icon, { size: 18 })}
          <h2>{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export default function Dashboard() {
  const [signals, setSignals] = useState([]);
  const [workshops, setWorkshops] = useState([]);
  const [outputs, setOutputs] = useState([]);
  const [timeframe, setTimeframe] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      setLoading(true);

      try {
        const [signalsRes, workshopsRes] = await Promise.all([
          signalsApi.getAll({ limit: 100 }),
          workshopsApi.getAll(),
        ]);

        if (!isMounted) return;

        const loadedSignals = signalsRes.data.data || [];
        const loadedWorkshops = workshopsRes.data.workshops || [];
        const loadedOutputs = workshopsRes.data.outputs || [];

        setSignals(loadedSignals);
        setWorkshops(loadedWorkshops);
        setOutputs(loadedOutputs);
        setUpdatedAt(new Date());
      } catch (error) {
        console.error('Failed to load dashboard data', error);
        if (!isMounted) return;
        setSignals([]);
        setWorkshops([]);
        setOutputs([]);
        setUpdatedAt(new Date());
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const scopedSignals = useMemo(
    () => signals.filter(signal => isWithinTimeframe(signal, ['createdAt', 'updatedAt'], timeframe)),
    [signals, timeframe],
  );
  const scopedWorkshops = useMemo(
    () => workshops.filter(workshop => isWithinTimeframe(workshop, ['lastActive', 'updatedAt', 'createdAt'], timeframe)),
    [timeframe, workshops],
  );
  const scopedOutputs = useMemo(
    () => outputs.filter(output => isWithinTimeframe(output, ['date', 'createdAt'], timeframe)),
    [outputs, timeframe],
  );

  const metrics = useMemo(() => {
    const totalVotes = scopedSignals.reduce((sum, signal) => sum + (signal.totalVotes || 0), 0);
    const avgImpact =
      scopedSignals.length > 0
        ? scopedSignals.reduce((sum, signal) => sum + (signal.impactScore || 0), 0) / scopedSignals.length
        : 0;
    const highImpact = scopedSignals.filter(signal => getImpactLevel(signal.impactScore) === 'high').length;
    const activeWorkshops = scopedWorkshops.filter(workshop => workshop.isActive).length;
    const participants = scopedWorkshops.reduce(
      (sum, workshop) => sum + (workshop._count?.participants || workshop.participants?.length || 0),
      0,
    );

    return {
      totalVotes,
      avgImpact,
      highImpact,
      activeWorkshops,
      participants,
      published: scopedSignals.filter(signal => signal.status === 'PUBLISHED').length,
    };
  }, [scopedSignals, scopedWorkshops]);

  const pestelRows = useMemo(() => {
    const counts = Object.keys(PESTEL_META).reduce((acc, key) => ({ ...acc, [key]: 0 }), {});

    scopedSignals.forEach(signal => {
      signal.pestelCategories?.forEach(category => {
        counts[category] = (counts[category] || 0) + 1;
      });
    });

    const total = Object.values(counts).reduce((sum, count) => sum + count, 0);

    return Object.entries(counts).map(([key, count]) => ({
      key,
      count,
      fillWidth: getProgressFillWidth(count, total),
      ...PESTEL_META[key],
    }));
  }, [scopedSignals]);

  const impactMix = useMemo(() => {
    const mix = { high: 0, medium: 0, low: 0 };
    scopedSignals.forEach(signal => {
      mix[getImpactLevel(signal.impactScore)] += 1;
    });
    const total = Math.max(scopedSignals.length, 1);

    return [
      { key: 'high', label: 'High', value: mix.high, percent: Math.round((mix.high / total) * 100) },
      { key: 'medium', label: 'Medium', value: mix.medium, percent: Math.round((mix.medium / total) * 100) },
      { key: 'low', label: 'Low', value: mix.low, percent: Math.round((mix.low / total) * 100) },
    ];
  }, [scopedSignals]);

  const horizonMix = useMemo(() => {
    const counts = { H1: 0, H2: 0, H3: 0 };
    scopedSignals.forEach(signal => {
      counts[signal.timeHorizon] = (counts[signal.timeHorizon] || 0) + 1;
    });

    return Object.entries(counts).map(([key, value]) => ({ key, value }));
  }, [scopedSignals]);

  const topSignals = useMemo(
    () => [...scopedSignals].sort((a, b) => (b.impactScore || 0) - (a.impactScore || 0)).slice(0, 5),
    [scopedSignals],
  );

  const recentOutputs = scopedOutputs.slice(0, 5);

  function handleExport() {
    const rows = [
      ['Blue Horizon Dashboard Export'],
      ['Timeframe', timeframe.toUpperCase()],
      ['Exported At', new Date().toISOString()],
      [],
      ['Metric', 'Value', 'Detail'],
      ['Signals', scopedSignals.length, `${metrics.published} published`],
      ['Average Impact', metrics.avgImpact.toFixed(1), `${metrics.highImpact} high impact`],
      ['Active Workshops', metrics.activeWorkshops, `${metrics.participants} participants`],
      ['Votes', metrics.totalVotes, 'Signal participation'],
      [],
      ['Top Signals'],
      ['Name', 'Impact Score', 'PESTEL', 'Horizon', 'Votes'],
      ...topSignals.map(signal => [
        signal.name,
        (signal.impactScore || 0).toFixed(1),
        signal.pestelCategories?.join('; ') || '',
        signal.timeHorizon || '',
        signal.totalVotes || 0,
      ]),
      [],
      ['Active Workshops'],
      ['Name', 'Horizon', 'Participants', 'Last Active'],
      ...scopedWorkshops.slice(0, 10).map(workshop => [
        workshop.name,
        workshop.horizon || '',
        workshop._count?.participants || workshop.participants?.length || 0,
        workshop.lastActive || workshop.updatedAt || workshop.createdAt || '',
      ]),
      [],
      ['Recent Outputs'],
      ['Name', 'Type', 'Created By', 'Date'],
      ...recentOutputs.map(output => [
        output.name,
        output.type,
        output.createdBy,
        output.date || output.createdAt || '',
      ]),
    ];

    downloadCsv(`blue-horizon-dashboard-${timeframe}.csv`, rows);
  }

  return (
    <div className="dashboard-page">
      <div className="page-header dashboard-page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Operational overview across signals, workshops, and strategic outputs.</p>
        </div>
        <div className="dashboard-header-actions">
          <div className="dashboard-segmented" aria-label="Timeframe">
            {['7d', '30d', '90d'].map(option => (
              <button
                key={option}
                type="button"
                className={timeframe === option ? 'active' : ''}
                onClick={() => setTimeframe(option)}
              >
                {option.toUpperCase()}
              </button>
            ))}
          </div>
          <button className="btn btn-secondary" type="button" onClick={() => window.location.reload()}>
            <RefreshCw size={16} />
            Refresh
          </button>
          <button className="btn btn-primary" type="button" onClick={handleExport} disabled={loading}>
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      <div className="dashboard-status-row">
        <div className="dashboard-status">
          <ShieldCheck size={18} />
          <span>System healthy</span>
        </div>
        <div className="dashboard-updated">
          {loading ? 'Loading live workspace data...' : `Updated ${updatedAt?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
        </div>
      </div>

      <div className="dashboard-stats-grid">
        <StatTile
          icon={Database}
          label="Signals"
          value={formatNumber(scopedSignals.length)}
          detail={`${metrics.published} published`}
          tone="primary"
        />
        <StatTile
          icon={Gauge}
          label="Avg Impact"
          value={metrics.avgImpact.toFixed(1)}
          detail={`${metrics.highImpact} high impact`}
          tone="danger"
        />
        <StatTile
          icon={Activity}
          label="Workshops"
          value={formatNumber(metrics.activeWorkshops)}
          detail={`${metrics.participants} participants`}
          tone="success"
        />
        <StatTile
          icon={ThumbsUp}
          label="Votes"
          value={formatNumber(metrics.totalVotes)}
          detail="Signal participation"
          tone="warning"
        />
      </div>

      <div className="dashboard-grid">
        <Panel
          title="Signal Portfolio"
          icon={BarChart3}
          action={<span className="badge badge-action">{timeframe.toUpperCase()}</span>}
        >
          <div className="dashboard-portfolio">
            <div className="dashboard-donut" aria-label="Impact mix">
              {impactMix.map(item => (
                <div key={item.key} className={`dashboard-donut-row ${item.key}`}>
                  <div>
                    <strong>{item.percent}%</strong>
                    <span>{item.label}</span>
                  </div>
                  <span>{item.value}</span>
                </div>
              ))}
            </div>
            <div className="dashboard-horizon">
              <div className="dashboard-mini-title">Horizon Split</div>
              {horizonMix.map(item => (
                <div key={item.key} className="dashboard-horizon-row">
                  <span>{item.key}</span>
                  <div className="dashboard-horizon-track">
                    <div style={{ width: `${getProgressFillWidth(item.value, scopedSignals.length)}%` }} />
                  </div>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <Panel title="PESTEL Distribution" icon={Globe2}>
          <div className="dashboard-pestel-list">
            {pestelRows.map(row => (
              <div key={row.key} className="dashboard-pestel-row">
                <div className="dashboard-pestel-label">
                  <span className={`dashboard-pestel-dot ${row.className}`} />
                  <span>{row.label}</span>
                </div>
                <div className="dashboard-pestel-bar">
                  <div className={row.className} style={{ width: `${row.fillWidth}%` }} />
                </div>
                <strong>{row.count}</strong>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Highest Impact Signals" icon={TrendingUp}>
          <div className="dashboard-signal-list">
            {topSignals.map(signal => (
              <div key={signal.id} className="dashboard-signal-row">
                <div>
                  <h3>{signal.name}</h3>
                  <span>{signal.pestelCategories?.[0] || 'UNCATEGORIZED'} · {signal.timeHorizon}</span>
                </div>
                <div className={`dashboard-impact-pill ${getImpactLevel(signal.impactScore)}`}>
                  {(signal.impactScore || 0).toFixed(1)}
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Active Workshops" icon={Users}>
          <div className="dashboard-workshop-list">
            {scopedWorkshops.slice(0, 4).map(workshop => (
              <div key={workshop.id} className="dashboard-workshop-row">
                <div>
                  <h3>{workshop.name}</h3>
                  <span>{workshop.description || 'No description'}</span>
                </div>
                <div className="dashboard-workshop-meta">
                  <span className="badge badge-live">{workshop.horizon}</span>
                  <strong>{workshop._count?.participants || workshop.participants?.length || 0}</strong>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Recent Outputs" icon={FileText}>
          <div className="dashboard-output-table">
            {recentOutputs.map((output, index) => (
              <div key={output.id || index} className="dashboard-output-row">
                <div>
                  <h3>{output.name}</h3>
                  <span>{output.type}</span>
                </div>
                <div>
                  <strong>{output.createdBy}</strong>
                  <span>{new Date(output.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Action Queue" icon={AlertTriangle}>
          <div className="dashboard-action-list">
            <div className="dashboard-action-row">
              <CalendarClock size={18} />
              <div>
                <h3>{metrics.highImpact} high-impact signals need review</h3>
                <span>Prioritize scoring calibration and ownership.</span>
              </div>
            </div>
            <div className="dashboard-action-row">
              <Users size={18} />
              <div>
                <h3>{metrics.activeWorkshops} active workshops in progress</h3>
                <span>Monitor selected scenarios and output readiness.</span>
              </div>
            </div>
            <div className="dashboard-action-row">
              <FileText size={18} />
              <div>
                <h3>{scopedOutputs.length} strategic outputs available</h3>
                <span>Review recent reports before executive circulation.</span>
              </div>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
