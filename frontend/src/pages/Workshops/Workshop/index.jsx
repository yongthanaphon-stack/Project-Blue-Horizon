import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, FileText, ChevronDown } from 'lucide-react';
import { workshopsApi } from '../../../api/api';
import { mockOutputs, mockWorkshops } from '../../../mocks/mockData';
import { formatDate, timeAgo } from '../../../utils/date';

const HORIZON_CONFIG = {
  H1: { label: 'HORIZON 1', color: '#f97316', bg: '#fff7ed', border: '#fed7aa' },
  H2: { label: 'HORIZON 2', color: '#10b981', bg: '#ecfdf5', border: '#a7f3d0' },
  H3: { label: 'HORIZON 3', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
};

const HORIZON_ORDER = { H1: 1, H2: 2, H3: 3 };

const AVATAR_COLORS = ['#60a5fa', '#f59e0b', '#34d399', '#a78bfa', '#f472b6'];

function AvatarStack({ count = 0 }) {
  const visible = Math.min(count, 3);
  const extra = count - 3;
  return (
    <div className="ws-avatar-stack">
      {Array.from({ length: visible }).map((_, i) => (
        <div
          key={i}
          className="ws-avatar"
          style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length], zIndex: 10 - i }}
        />
      ))}
      {extra > 0 && (
        <div className="ws-avatar ws-avatar-extra">+{extra}</div>
      )}
    </div>
  );
}

const TYPE_STYLES = {
  'Strategy Deck': { bg: '#eff6ff', color: '#1d4ed8' },
  'Workshop Log': { bg: '#f0fdf4', color: '#15803d' },
  'Analysis Paper': { bg: '#fefce8', color: '#a16207' },
};

export default function Workshop() {
  const [workshops, setWorkshops] = useState([]);
  const [outputs, setOutputs] = useState([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const res = await workshopsApi.getAll();
        if (!isMounted) return;
        setWorkshops(res.data.workshops || []);
        setOutputs(res.data.outputs || []);
      } catch {
        if (!isMounted) return;
        setWorkshops(mockWorkshops);
        setOutputs(mockOutputs);
      }
    }
    loadData();
    return () => { isMounted = false; };
  }, []);

  const displayWorkshops = useMemo(() => {
    const source = workshops.length ? workshops : mockWorkshops;
    return [...source].sort((a, b) => {
      return (HORIZON_ORDER[a.horizon] || 99) - (HORIZON_ORDER[b.horizon] || 99);
    });
  }, [workshops]);

  const displayOutputs = outputs.length ? outputs : mockOutputs;
  const visibleOutputs = showAll ? displayOutputs : displayOutputs.slice(0, 3);
  const liveCount = displayWorkshops.filter(w => w.isActive).length;

  return (
    <div className="ws-page">

      {/* ── Page Header ── */}
      <div className="ws-page-header">
        <div className="ws-page-header-left">
          <h1 className="ws-page-title">Strategic Workshop</h1>
          <p className="ws-page-subtitle">
            Facilitate collaborative foresight sessions and translate signals into strategy.
          </p>
        </div>
        <Link to="/workshop/new" className="ws-new-btn" id="new-workshop-btn">
          <Plus size={16} strokeWidth={2.5} />
          New Workshop Session
        </Link>
      </div>

      {/* ── Active Sessions ── */}
      <section className="ws-section">
        <div className="ws-section-header">
          <div className="ws-section-title-row">
            <h2 className="ws-section-title">Active Sessions</h2>
            <span className="ws-live-badge">
              <span className="ws-live-dot" />
              {liveCount} LIVE
            </span>
          </div>
        </div>

        <div className="ws-cards-grid">
          {displayWorkshops.map(ws => {
            const hz = HORIZON_CONFIG[ws.horizon] || HORIZON_CONFIG.H1;
            const participantCount = ws._count?.participants || 0;
            return (
              <div key={ws.id} className="ws-card">
                {/* Card top bar */}
                <div className="ws-card-top">
                  <span
                    className="ws-horizon-badge"
                    style={{ color: hz.color, background: hz.bg, borderColor: hz.border }}
                  >
                    {hz.label}
                  </span>
                  <AvatarStack count={participantCount} />
                </div>

                {/* Card body */}
                <div className="ws-card-body">
                  <h3 className="ws-card-title">{ws.name}</h3>
                  <p className="ws-card-desc">{ws.description}</p>
                </div>

                {/* Card footer */}
                <div className="ws-card-footer">
                  <span className="ws-card-meta">
                    Last active: {timeAgo(ws.lastActive || new Date())}
                  </span>
                  <Link
                    to={`/workshop/${ws.id}/radar`}
                    className="ws-join-btn"
                    id={`join-session-${ws.id}`}
                  >
                    Join Session
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Recent Outputs ── */}
      <section className="ws-section">
        <div className="ws-section-header">
          <h2 className="ws-section-title">Recent Outputs</h2>
          <a href="#" className="ws-view-all-link" id="view-all-reports">
            View all reports
          </a>
        </div>

        <div className="ws-table-wrap">
          <table className="ws-table">
            <thead>
              <tr>
                <th>Document Name</th>
                <th>Type</th>
                <th>Created By</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {visibleOutputs.map((output, i) => {
                const ts = TYPE_STYLES[output.type] || { bg: '#f1f5f9', color: '#475569' };
                return (
                  <tr key={i} className="ws-table-row">
                    <td>
                      <div className="ws-doc-name">
                        <div className="ws-doc-icon">
                          <FileText size={14} />
                        </div>
                        <span>{output.name}</span>
                      </div>
                    </td>
                    <td>
                      <span
                        className="ws-type-badge"
                        style={{ background: ts.bg, color: ts.color }}
                      >
                        {output.type}
                      </span>
                    </td>
                    <td className="ws-creator">{output.createdBy}</td>
                    <td className="ws-date">
                      {formatDate(output.date)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="ws-load-more-row">
            <button
              className="ws-load-more-btn"
              id="load-more-outputs"
              onClick={() => setShowAll(v => !v)}
            >
              {showAll ? 'Show Less' : 'Load More Outputs'}
              <ChevronDown
                size={14}
                style={{
                  transform: showAll ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.2s',
                }}
              />
            </button>
          </div>
        </div>
      </section>

    </div>
  );
}
