import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ThumbsUp, Info, Users2, FileText, ExternalLink, Link2, AlertCircle, Link as LinkIcon } from 'lucide-react';
import { signalsApi } from '../../../api/api';
import './SignalDetail.css';

function PestelBadge({ category }) {
  const map = {
    TECHNOLOGICAL: 'tech', ECONOMIC: 'economic', SOCIAL: 'social',
    POLITICAL: 'political', ENVIRONMENTAL: 'enviro', LEGAL: 'legal',
  };
  return <span className={`sd-badge sd-badge-${map[category] || 'tech'}`}>{category}</span>;
}

function LoadingState() {
  return (
    <div className="sd-state-container">
      <div className="sd-spinner" />
      <p style={{ color: '#64748b', fontWeight: 600 }}>Loading signal data...</p>
    </div>
  );
}

function ErrorState({ isNotFound }) {
  if (isNotFound) {
    return (
      <div className="sd-state-container">
        <AlertCircle size={48} color="#ef4444" style={{ marginBottom: 16 }} />
        <h2 className="sd-error-title">Signal Not Found</h2>
        <p className="sd-error-desc">This signal may have been deleted or you don't have permission to view it.</p>
        <Link to="/signals" className="sd-btn sd-btn-primary">Return to Signal Bank</Link>
      </div>
    );
  }
  return (
    <div className="sd-state-container">
      <h2 className="sd-error-title">An error occurred</h2>
      <p className="sd-error-desc">Failed to load signal data. Please try again later.</p>
    </div>
  );
}

export default function SignalDetail() {
  const { id } = useParams();
  
  const [signal, setSignal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState(null);
  const [voting, setVoting] = useState(false);
  const [voteScore, setVoteScore] = useState(8);
  const [showVoteStrip, setShowVoteStrip] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadSignal() {
      try {
        const res = await signalsApi.getById(id);
        if (isMounted) setSignal(res.data);
      } catch (err) {
        console.error(err);
        if (isMounted) {
          if (err.response?.status === 404) setNotFound(true);
          else setError('Failed to load signal');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadSignal();
    return () => { isMounted = false; };
  }, [id]);

  async function submitVote() {
    if (!voteScore) return;
    setVoting(true);
    try {
      await signalsApi.vote(id, { score: voteScore });
      const res = await signalsApi.getById(id);
      setSignal(res.data);
      setShowVoteStrip(false);
      alert('Vote submitted successfully!');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to submit vote.');
    } finally {
      setVoting(false);
    }
  }

  if (loading) return <LoadingState />;
  if (notFound || error) return <ErrorState isNotFound={notFound} />;

  const scoreDisplay = signal.impactScore === null ? '—' : signal.impactScore.toFixed(1);
  const scorePercent = signal.impactScore === null ? 0 : (signal.impactScore / 10) * 100;
  
  let impactClass = 'low';
  let impactLabel = 'Low';
  let impactDesc = 'Low priority watch';
  
  if (signal.impactScore >= 7) { 
    impactClass = 'high'; 
    impactLabel = 'High !'; 
    impactDesc = 'Immediate attention needed'; 
  } else if (signal.impactScore >= 4) { 
    impactClass = 'medium'; 
    impactLabel = 'Medium'; 
    impactDesc = 'Monitor regularly'; 
  } else if (signal.impactScore === null) { 
    impactClass = 'pending'; 
    impactLabel = 'Pending'; 
    impactDesc = 'Insufficient data'; 
  }

  const categories = signal.pestelCategories || [];
  const stakeholders = signal.stakeholders || [];
  const references = signal.references || [];
  const horizonLabels = { H1: 'Short Term', H2: 'Medium Term', H3: 'Long Term' };

  return (
    <div className="sd-page-wrapper">
      {/* Top Header Section */}
      <div className="sd-top-header">
        <div className="sd-top-header-left">
          <div className="sd-tags">
            {categories.map(cat => <PestelBadge key={cat} category={cat} />)}
          </div>
          <h1 className="sd-title">{signal.name}</h1>
          <p className="sd-summary">{signal.shortDetails || signal.description?.substring(0, 150)}</p>
          <div className="sd-actions-row">
            <button className="sd-btn sd-btn-primary" onClick={() => showVoteStrip ? submitVote() : setShowVoteStrip(true)} disabled={voting}>
              <ThumbsUp size={18} /> {voting ? 'Submitting...' : (showVoteStrip ? 'Confirm Vote' : 'Vote on Signal')}
            </button>
            {showVoteStrip && (
              <button className="sd-btn" style={{ marginLeft: '12px', background: '#f1f5f9', color: '#475569', border: 'none' }} onClick={() => setShowVoteStrip(false)}>
                Cancel
              </button>
            )}
          </div>
          <p className="sd-last-updated">
            Last updated: {new Date(signal.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <div className="sd-top-header-right">
          <Link to="/signals" className="sd-btn sd-btn-primary sd-btn-back">
            Back
          </Link>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="sd-layout-grid">
        <div className="sd-layout-main">
          {/* Vote Strip */}
          {showVoteStrip && (
            <div className="sd-inline-vote-strip">
              <div className="sd-vote-labels">
                <span>LOW IMPACT</span>
                <span>HIGH IMPACT</span>
              </div>
              <div className="sd-vote-grid">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                  <button
                    key={n}
                    className={`sd-vote-box ${voteScore === n ? 'active' : ''}`}
                    onClick={() => setVoteScore(n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Stat Cards Row */}
          <div className="sd-stats-row">
            <div className="sd-stat-card">
              <div className="sd-stat-label">IMPACT SCORE</div>
              <div className="sd-stat-value-row">
                <span className="sd-stat-value">{scoreDisplay}</span>
                {signal.impactScore !== null && <span className="sd-stat-change">+1.2%</span>}
              </div>
              <div className="sd-impact-track">
                <div className={`sd-impact-fill bg-${impactClass}`} style={{ width: `${scorePercent}%` }} />
              </div>
            </div>
            
            <div className="sd-stat-card">
              <div className="sd-stat-label">TOTAL VOTES</div>
              <div className="sd-stat-value">{signal.totalVotes?.toLocaleString() || 0}</div>
              <div className="sd-stat-desc">Active participation</div>
            </div>
            
            <div className="sd-stat-card">
              <div className="sd-stat-label">IMPACT LEVEL</div>
              <div className={`sd-stat-value text-${impactClass}`}>{impactLabel}</div>
              <div className="sd-stat-desc">{impactDesc}</div>
            </div>
          </div>

          {/* Detailed Analysis */}
          <div className="sd-card">
            <h3 className="sd-card-title"><FileText size={20} color="#0f4aa5" /> Detailed Analysis</h3>
            <div className="sd-text-content">
              {signal.description?.split('\n').map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          </div>

          {/* Reference Sources */}
          {references.length > 0 && (
            <div className="sd-card">
              <h3 className="sd-card-title sd-ref-title">REFERENCE SOURCES</h3>
              <ul className="sd-ref-list">
                {references.map((ref, i) => (
                  <li key={i} className="sd-ref-item">
                    <LinkIcon size={16} color="#94a3b8" className="sd-ref-icon-left" />
                    <a href={ref.url} target="_blank" rel="noopener noreferrer">{ref.title}</a>
                    <ExternalLink size={14} color="#cbd5e1" className="sd-ref-icon-right" />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="sd-layout-sidebar">
          {/* Signal Metadata */}
          <div className="sd-card">
            <h4 className="sd-card-title"><Info size={18} color="#0f4aa5" /> Signal Metadata</h4>
            <div className="sd-meta-row">
              <span className="sd-meta-key">Creation Date</span>
              <span className="sd-meta-val">
                {new Date(signal.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <div className="sd-meta-row">
              <span className="sd-meta-key">Horizon</span>
              <span className="sd-meta-val">
                <span className="sd-badge sd-badge-dark">{signal.timeHorizon}</span>
                {horizonLabels[signal.timeHorizon] || 'Medium Term'}
              </span>
            </div>
            <div className="sd-meta-row">
              <span className="sd-meta-key">Impact Level</span>
              <span className="sd-meta-val" style={{ textTransform: 'capitalize' }}>
                {signal.impactLevel?.toLowerCase()}
              </span>
            </div>
          </div>

          {/* Stakeholders */}
          <div className="sd-card">
            <h4 className="sd-card-title"><Users2 size={18} color="#0f4aa5" /> Stakeholders</h4>
            {stakeholders.length > 0 ? (
              <div className="sd-pill-container">
                {stakeholders.map((s, i) => <span key={i} className="sd-pill">{s}</span>)}
              </div>
            ) : (
              <p className="sd-empty">No stakeholders added.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
