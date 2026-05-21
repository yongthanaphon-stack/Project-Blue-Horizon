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

  const metrics = useMemo(() => {
    const totalVotes = signals.reduce((sum, signal) => sum + (signal.totalVotes || 0), 0);
    const avgImpact =
      signals.length > 0
        ? signals.reduce((sum, signal) => sum + (signal.impactScore || 0), 0) / signals.length
        : 0;
    const highImpact = signals.filter(signal => getImpactLevel(signal.impactScore) === 'high').length;
    const activeWorkshops = workshops.filter(workshop => workshop.isActive).length;
    const participants = workshops.reduce(
      (sum, workshop) => sum + (workshop._count?.participants || workshop.participants?.length || 0),
      0,
    );

    return {
      totalVotes,
      avgImpact,
      highImpact,
      activeWorkshops,
      participants,
      published: signals.filter(signal => signal.status === 'PUBLISHED').length,
    };
  }, [signals, workshops]);

  const pestelRows = useMemo(() => {
    const counts = Object.keys(PESTEL_META).reduce((acc, key) => ({ ...acc, [key]: 0 }), {});

    signals.forEach(signal => {
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
  }, [signals]);

  const impactMix = useMemo(() => {
    const mix = { high: 0, medium: 0, low: 0 };
    signals.forEach(signal => {
      mix[getImpactLevel(signal.impactScore)] += 1;
    });
    const total = Math.max(signals.length, 1);

    return [
      { key: 'high', label: 'High', value: mix.high, percent: Math.round((mix.high / total) * 100) },
      { key: 'medium', label: 'Medium', value: mix.medium, percent: Math.round((mix.medium / total) * 100) },
      { key: 'low', label: 'Low', value: mix.low, percent: Math.round((mix.low / total) * 100) },
    ];
  }, [signals]);

  const horizonMix = useMemo(() => {
    const counts = { H1: 0, H2: 0, H3: 0 };
    signals.forEach(signal => {
      counts[signal.timeHorizon] = (counts[signal.timeHorizon] || 0) + 1;
    });

    return Object.entries(counts).map(([key, value]) => ({ key, value }));
  }, [signals]);

  const topSignals = useMemo(
    () => [...signals].sort((a, b) => (b.impactScore || 0) - (a.impactScore || 0)).slice(0, 5),
    [signals],
  );

  const recentOutputs = outputs.slice(0, 5);

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
          <button className="btn btn-primary" type="button">
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
          value={formatNumber(signals.length)}
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
                    <div style={{ width: `${getProgressFillWidth(item.value, signals.length)}%` }} />
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
            {workshops.slice(0, 4).map(workshop => (
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
                <h3>{outputs.length} strategic outputs available</h3>
                <span>Review recent reports before executive circulation.</span>
              </div>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
