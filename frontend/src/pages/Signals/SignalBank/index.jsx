import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Info, LayoutGrid, List, Plus, ThumbsUp } from 'lucide-react';
import { signalsApi } from '../../../api/api';
import { truncateText } from '../../../utils/text';

const PESTEL_FILTERS = [
  { label: 'Political', value: 'POLITICAL' },
  { label: 'Economic', value: 'ECONOMIC' },
  { label: 'Social', value: 'SOCIAL' },
  { label: 'Tech', value: 'TECHNOLOGICAL' },
  { label: 'Enviro', value: 'ENVIRONMENTAL' },
  { label: 'Legal', value: 'LEGAL' },
];

const IMPACT_FILTERS = ['Global', 'Region', 'Country'];
const HORIZON_FILTERS = ['H1', 'H2', 'H3'];
const PESTEL_FILTER_VALUES = new Set(PESTEL_FILTERS.map(filter => filter.value));
const PESTEL_QUERY_ALIASES = {
  ECONOMY: 'ECONOMIC',
  ECONOMIC: 'ECONOMIC',
  ENVIRONMENT: 'ENVIRONMENTAL',
  ENVIRONMENTAL: 'ENVIRONMENTAL',
  POLITICS: 'POLITICAL',
  POLITICAL: 'POLITICAL',
  SOCIETY: 'SOCIAL',
  SOCIAL: 'SOCIAL',
  TECH: 'TECHNOLOGICAL',
  TECHNOLOGY: 'TECHNOLOGICAL',
  TECHNOLOGICAL: 'TECHNOLOGICAL',
  LEGAL: 'LEGAL',
};

const PESTEL_BADGE_LABELS = {
  POLITICAL: 'POLITICAL',
  ECONOMIC: 'ECONOMIC',
  SOCIAL: 'SOCIAL',
  TECHNOLOGICAL: 'TECHNOLOGY',
  ENVIRONMENTAL: 'ENVIRONMENTAL',
  LEGAL: 'LEGAL',
};

function normalizeSignals(signals) {
  return signals.map(signal => ({
    ...signal,
    totalVotes: signal.totalVotes ?? signal._count?.votes ?? 0,
    impactScore: signal.impactScore === null ? null : Number(signal.impactScore),
  }));
}

function getImpactClass(score) {
  if (score === null) return 'unknown';
  if (score >= 7) return 'high';
  if (score >= 4) return 'medium';
  return 'low';
}

function getImpactLabel(score) {
  if (score === null) return 'PENDING';
  if (score >= 7) return 'HIGH';
  if (score >= 4) return 'MEDIUM';
  return 'LOW';
}

function getPreview(signal) {
  return signal.shortDetails || truncateText(signal.description, 96);
}

function getCategoryKey(category) {
  return category.toLowerCase().replace('technological', 'technology');
}

function filterSignals(source, filters) {
  const { activePestel, activeImpact, activeHorizon, activeSearch } = filters;
  const normalizedSearch = activeSearch?.trim().toLowerCase();

  return source.filter(signal => {
    const matchesPestel = !activePestel ||
      signal.pestelCategories?.includes(activePestel);
    const matchesImpact = !activeImpact || signal.impactLevel === activeImpact.toUpperCase();
    const matchesHorizon = !activeHorizon || signal.timeHorizon === activeHorizon;
    const matchesSearch = !normalizedSearch ||
      signal.name?.toLowerCase().includes(normalizedSearch) ||
      signal.shortDetails?.toLowerCase().includes(normalizedSearch) ||
      signal.description?.toLowerCase().includes(normalizedSearch);
    return matchesPestel && matchesImpact && matchesHorizon && matchesSearch;
  });
}

function getPestelFromParams(searchParams) {
  const rawValue = (searchParams.get('pestel') || searchParams.get('category') || '').toUpperCase();
  const value = PESTEL_QUERY_ALIASES[rawValue] || rawValue;
  return PESTEL_FILTER_VALUES.has(value) ? value : null;
}

function getSearchFromParams(searchParams) {
  return (searchParams.get('search') || searchParams.get('q') || '').trim();
}

function getDisplayPestelCategory(signal, activePestel) {
  if (activePestel && signal.pestelCategories?.includes(activePestel)) {
    return activePestel;
  }

  return signal.pestelCategories?.[0] || 'POLITICAL';
}

function PestelBadge({ category }) {
  const key = getCategoryKey(category);
  const label = PESTEL_BADGE_LABELS[category] || category;
  return <span className={`bank-badge bank-badge-${key}`}>{label}</span>;
}

function MetaBadge({ children }) {
  return <span className="bank-badge bank-badge-neutral">{children}</span>;
}

function HorizonDot({ horizon }) {
  const colors = { H1: '#38a169', H2: '#d69e2e', H3: '#3182ce' };
  return (
    <span
      className="horizon-dot"
      style={{ background: colors[horizon] || '#a0aec0' }}
      aria-hidden="true"
    />
  );
}

function ImpactScore({ score }) {
  return (
    <div className="signal-bank-impact">
      <span>IMPACT SCORE</span>
      {score === null ? (
        <strong className="impact-score unknown" style={{ color: '#8fa0b5' }}>— / 10</strong>
      ) : (
        <strong className={`impact-score ${getImpactClass(score)}`}>{score.toFixed(1)} / 10</strong>
      )}
    </div>
  );
}

const SkeletonCard = () => (
  <article className="signal-bank-card skeleton-card" style={{ opacity: 0.7, pointerEvents: 'none' }}>
    <div style={{ height: 20, width: '100%', background: '#e2e8f0', marginBottom: 15, borderRadius: 4, animation: 'pulse 1.5s infinite' }}></div>
    <div style={{ height: 24, width: '70%', background: '#e2e8f0', marginBottom: 15, borderRadius: 4, animation: 'pulse 1.5s infinite' }}></div>
    <div style={{ height: 60, width: '100%', background: '#e2e8f0', marginBottom: 15, borderRadius: 4, animation: 'pulse 1.5s infinite' }}></div>
  </article>
);

const EmptyState = () => (
  <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b', background: '#fff', borderRadius: 12 }}>
    <Info size={48} style={{ margin: '0 auto 15px', opacity: 0.5 }} />
    <h3 style={{ fontSize: '1.25rem', marginBottom: 8, color: '#1e293b' }}>No Signals Found</h3>
    <p>Try adjusting your filters or search terms.</p>
  </div>
);

function SignalCard({ signal, mode, meta, activePestel }) {
  const displayCategory = getDisplayPestelCategory(signal, activePestel);

  return (
    <article className={`signal-bank-card signal-bank-card-${mode}`}>
      <div className="signal-bank-card-header">
        <div className="signal-bank-tags">
          <PestelBadge category={displayCategory} />
          <MetaBadge>{meta}</MetaBadge>
        </div>
        <ImpactScore score={signal.impactScore} />
      </div>

      <h3>{signal.name}</h3>
      <p>{getPreview(signal)}</p>

      <div className={`signal-bank-card-footer ${mode === 'new' ? 'with-divider' : ''}`}>
        <div className="signal-bank-votes" aria-label={`${signal.totalVotes} community votes`}>
          <ThumbsUp size={16} strokeWidth={1.7} />
          <span>{signal.totalVotes}</span>
        </div>
        <div className="signal-bank-actions">
          <Link to={`/signals/${signal.id}`} className="btn btn-vote signal-bank-detail-button">View Details</Link>
        </div>
      </div>
    </article>
  );
}

export default function SignalBank() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [signals, setSignals] = useState([]);
  const [needsVote, setNeedsVote] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [view, setView] = useState('card');
  const activePestel = getPestelFromParams(searchParams);
  const activeSearch = getSearchFromParams(searchParams);
  const [activeImpact, setActiveImpact] = useState(null);
  const [activeHorizon, setActiveHorizon] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    let isMounted = true;

    async function loadSignals() {
      try {
        const [signalsResponse, needsVoteResponse] = await Promise.all([
          signalsApi.getAll({ 
            page, 
            limit: 20,
            search: activeSearch || undefined,
            pestel: activePestel || undefined,
            impact: activeImpact?.toUpperCase() || undefined,
            horizon: activeHorizon || undefined,
          }),
          signalsApi.getNeedsVote(),
        ]);

        if (!isMounted) return;

        setSignals(normalizeSignals(signalsResponse.data?.data || []));
        setNeedsVote(normalizeSignals(needsVoteResponse.data || []));
        setTotalPages(signalsResponse.data?.meta?.totalPages || 1);
      } catch (error) {
        console.error('Failed to load signals', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadSignals();

    return () => { isMounted = false; };
  }, [page, activePestel, activeImpact, activeHorizon, activeSearch]);

  const displayNeedsVote = useMemo(() => {
    return filterSignals(needsVote, { activePestel, activeImpact, activeHorizon, activeSearch });
  }, [activeHorizon, activeImpact, activePestel, activeSearch, needsVote]);

  const displaySignals = signals; // Server-side filtering already applied
  const showNeedsVoteSection = view === 'card' && !loading && displayNeedsVote.length > 0;

  function handlePestelFilter(nextPestel) {
    const nextParams = new URLSearchParams(searchParams);
    if (nextPestel) {
      nextParams.set('pestel', nextPestel);
    } else {
      nextParams.delete('pestel');
      nextParams.delete('category');
    }

    setSearchParams(nextParams, { replace: true });
    setPage(1);
  }

  return (
    <div className="signal-bank-page">
      <header className="signal-bank-header">
        <div>
          <h1>Signal Repository</h1>
          <p>Monitor and evaluate emerging trends and strategic signals.</p>
        </div>
        <div className="signal-bank-header-actions">
          <div className="view-toggle signal-bank-view-toggle">
            <button
              type="button"
              className={view === 'card' ? 'active' : ''}
              onClick={() => setView('card')}
              aria-label="Card view"
              title="Card view"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              type="button"
              className={view === 'table' ? 'active' : ''}
              onClick={() => setView('table')}
              aria-label="Table view"
              title="Table view"
            >
              <List size={16} />
            </button>
          </div>
          <Link to="/signals/new" className="btn btn-primary signal-bank-add-btn">
            <Plus size={17} /> Add Signal
          </Link>
        </div>
      </header>

      <section className="signal-bank-filters" aria-label="Signal filters">
        <div className="bank-filter-row">
          <div className="bank-filter-segment bank-filter-pestel">
            <span>PESTEL</span>
            {PESTEL_FILTERS.map(filter => (
              <button
                key={filter.value}
                type="button"
                className={activePestel === filter.value ? 'active' : ''}
                onClick={() => {
                  handlePestelFilter(activePestel === filter.value ? null : filter.value);
                }}
              >
                {filter.label}
              </button>
            ))}
          </div>
          <div className="bank-filter-segment bank-filter-impact">
            <span>IMPACT</span>
            {IMPACT_FILTERS.map(filter => (
              <button
                key={filter}
                type="button"
                className={activeImpact === filter ? 'active' : ''}
                onClick={() => {
                  setActiveImpact(activeImpact === filter ? null : filter);
                  setPage(1);
                }}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
        <div className="bank-filter-row">
          <div className="bank-filter-segment bank-filter-horizon">
            <span>HORIZON</span>
            {HORIZON_FILTERS.map(filter => (
              <button
                key={filter}
                type="button"
                className={activeHorizon === filter ? 'active' : ''}
                onClick={() => {
                  setActiveHorizon(activeHorizon === filter ? null : filter);
                  setPage(1);
                }}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
      </section>

      {showNeedsVoteSection && (
        <section className="signal-bank-section signal-bank-new-section">
          <div className="signal-bank-section-title">
            <h2>New Signals (Needs Vote)</h2>
            <span className="badge badge-action">{displayNeedsVote.length} ACTION REQUIRED</span>
          </div>
          <div className="signals-grid signal-bank-grid">
            {displayNeedsVote.map((signal) => (
              <SignalCard
                key={signal.id}
                signal={signal}
                mode="new"
                meta={signal.timeHorizon}
                activePestel={activePestel}
              />
            ))}
          </div>
        </section>
      )}

      <section className="signal-bank-section">
        <div className="signal-bank-all-header">
          <h2>All Signals</h2>
          <div className="signal-bank-sort">
            <span>SORT BY:</span>
            <strong>Most Recent</strong>
          </div>
        </div>

        {loading ? (
          <div className="signals-grid signal-bank-grid signal-bank-all-grid">
            <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
          </div>
        ) : displaySignals.length === 0 ? (
          <EmptyState />
        ) : view === 'table' ? (
          <div className="table-container signal-bank-table">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Signal Name</th>
                  <th>PESTEL Tags</th>
                  <th>Horizon</th>
                  <th>Impact Score</th>
                  <th>Votes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displaySignals.map(signal => (
                  <tr key={signal.id}>
                    <td>
                      <div className="table-signal-name">
                        <h4>{signal.name}</h4>
                        <p>{getPreview(signal)}</p>
                      </div>
                    </td>
                    <td>
                      <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                        {signal.pestelCategories?.map(category => (
                          <PestelBadge key={category} category={category} />
                        ))}
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <HorizonDot horizon={signal.timeHorizon} />
                        {signal.timeHorizon}
                      </div>
                    </td>
                    <td>
                      {signal.impactScore === null ? (
                        <span style={{ color: '#8fa0b5', fontWeight: 600 }}>—</span>
                      ) : (
                        <>
                          <span className={`impact-score ${getImpactClass(signal.impactScore)}`}>
                            {signal.impactScore.toFixed(1)}
                          </span>
                          {' '}
                          <span className={`badge badge-${getImpactClass(signal.impactScore)}`}>
                            {getImpactLabel(signal.impactScore)}
                          </span>
                        </>
                      )}
                    </td>
                    <td>{signal.totalVotes}</td>
                    <td>
                      <Link to={`/signals/${signal.id}`} className="btn btn-vote signal-bank-detail-button">
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="table-footer">
              <span>Showing {displaySignals.length} signals</span>
              <div className="pagination">
                <button type="button" className="page-btn" disabled={page <= 1} onClick={() => setPage(prev => Math.max(1, prev - 1))}>
                  <ChevronLeft size={14} />
                </button>
                {Array.from({ length: totalPages }, (_, index) => index + 1).map(nextPage => (
                  <button
                    key={nextPage}
                    type="button"
                    className={`page-btn ${page === nextPage ? 'active' : ''}`}
                    onClick={() => setPage(nextPage)}
                  >
                    {nextPage}
                  </button>
                ))}
                <button type="button" className="page-btn" disabled={page >= totalPages} onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="signals-grid signal-bank-grid signal-bank-all-grid">
              {displaySignals.map(signal => (
                <SignalCard
                  key={signal.id}
                  signal={signal}
                  mode="all"
                  meta={signal.impactLevel === 'GLOBAL' || signal.impactLevel === 'REGION' ? signal.impactLevel : signal.timeHorizon}
                  activePestel={activePestel}
                />
              ))}
            </div>
            <div className="table-footer" style={{ marginTop: '20px' }}>
              <span>Showing {displaySignals.length} signals</span>
              <div className="pagination">
                <button type="button" className="page-btn" disabled={page <= 1} onClick={() => setPage(prev => Math.max(1, prev - 1))}>
                  <ChevronLeft size={14} />
                </button>
                {Array.from({ length: totalPages }, (_, index) => index + 1).map(nextPage => (
                  <button
                    key={nextPage}
                    type="button"
                    className={`page-btn ${page === nextPage ? 'active' : ''}`}
                    onClick={() => setPage(nextPage)}
                  >
                    {nextPage}
                  </button>
                ))}
                <button type="button" className="page-btn" disabled={page >= totalPages} onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
