import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  TrendingUp,
  Leaf,
  Cpu,
  Users,
  Building2,
  Scale,
  ArrowRight,
  RefreshCw,
  ThumbsUp,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useSignalSuggestions } from '../../hooks/useSignalSuggestions';
import { publicSignalsApi } from '../../api/api';
import { truncateText } from '../../utils/text';
import SignalSearchSuggestions from '../../components/Signals/SignalSearchSuggestions';
import Logo from '../../components/Logo';
import './Home.css';

/* Inline brand SVG icons (not available in this lucide-react version) */
function TwitterIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function GithubIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

const POPULAR_SEARCHES = [
  'Population 2024',
  'GDP Forecast',
  'Real Estate Prices',
  'Climate APIs',
];

const SIGNAL_DOMAINS = [
  { icon: Building2, label: 'Politics', description: 'Policy, Governance, Regulation', color: '#dd6b20', pestel: 'POLITICAL' },
  { icon: TrendingUp, label: 'Economy', description: 'GDP, Finance, Trade', color: '#2b6cb0', pestel: 'ECONOMIC' },
  { icon: Users, label: 'Society', description: 'Labor, Census, Culture', color: '#e53e3e', pestel: 'SOCIAL' },
  { icon: Cpu, label: 'Technology', description: 'Digital, AI, R&D', color: '#805ad5', pestel: 'TECHNOLOGICAL' },
  { icon: Leaf, label: 'Environment', description: 'Climate, Water, Air', color: '#319795', pestel: 'ENVIRONMENTAL' },
  { icon: Scale, label: 'Legal', description: 'Law, Compliance, Rights', color: '#38a169', pestel: 'LEGAL' },
];

const PLATFORM_STATS = [
  { value: '12.4M+', label: 'SIGNALS' },
  { value: '500', label: 'WORKSHOP' },
  { value: '1000', label: 'USERS' },
  { value: '99.9%', label: 'TESTIMONIAL' },
];

const FEATURED_SIGNAL_FALLBACKS = [
  {
    title: 'Automated Border Sovereignty Protocols',
    description: 'AI-driven automated diplomacy tools used for real-time maritime border...',
    categories: [
      { label: 'POLITICAL', color: 'political' },
      { label: 'GLOBAL', color: 'global' },
    ],
    impactScore: 9.1,
    votes: 42,
    detailPath: '/signals',
  },
  {
    title: 'Synthetic Content Liability Acts',
    description: "EU's new framework holding AI developers directly liable for...",
    categories: [
      { label: 'LEGAL', color: 'legal' },
      { label: 'REGION', color: 'region' },
    ],
    impactScore: 4.2,
    votes: 28,
    detailPath: '/signals',
  },
  {
    title: 'The Rise of "Zero-Trust" Freelancing',
    description: 'Shift towards smart-contract escrow payments for 100% of micro-task labor...',
    categories: [
      { label: 'ECONOMIC', color: 'economic' },
      { label: 'GLOBAL', color: 'global' },
    ],
    impactScore: 1.5,
    votes: 5,
    detailPath: '/signals',
  },
];

const PESTEL_CATEGORY_META = {
  POLITICAL: { label: 'POLITICAL', color: 'political' },
  ECONOMIC: { label: 'ECONOMIC', color: 'economic' },
  SOCIAL: { label: 'SOCIAL', color: 'social' },
  TECHNOLOGICAL: { label: 'TECHNOLOGY', color: 'technological' },
  ENVIRONMENTAL: { label: 'ENVIRONMENTAL', color: 'environmental' },
  LEGAL: { label: 'LEGAL', color: 'legal' },
};

function getFeaturedDescription(signal) {
  return signal.shortDetails || truncateText(signal.description, 96);
}

async function fetchFeaturedSignals() {
  const response = await publicSignalsApi.getFeatured({ limit: 3 });
  return (response.data || []).map(normalizeFeaturedSignal);
}

function normalizeFeaturedSignal(signal) {
  const categories = (signal.pestelCategories || [])
    .slice(0, 1)
    .map((category) => PESTEL_CATEGORY_META[category] || {
      label: category,
      color: category.toLowerCase(),
    });

  if (signal.impactLevel) {
    categories.push({
      label: signal.impactLevel,
      color: signal.impactLevel.toLowerCase(),
    });
  }

  return {
    id: signal.id,
    title: signal.name,
    description: getFeaturedDescription(signal),
    categories,
    impactScore: signal.impactScore === null ? null : Number(signal.impactScore),
    votes: signal.totalVotes ?? signal._count?.votes ?? 0,
    detailPath: `/signals/${signal.id}`,
  };
}

function buildSignalSearchPath(value) {
  const search = value.trim();
  if (!search) return '/signals';

  const params = new URLSearchParams({ search });
  return `/signals?${params.toString()}`;
}

/* Animated counter hook */
function useCounter(target, duration = 2000, startOnMount = true) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!startOnMount) return;
    const numericTarget = parseFloat(target.replace(/[^0-9.]/g, ''));
    if (isNaN(numericTarget)) return;
    const increment = numericTarget / (duration / 16);
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= numericTarget) {
        clearInterval(timer);
        current = numericTarget;
      }
      setCount(current);
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration, startOnMount]);

  // Format the output like the target string
  const suffix = target.replace(/[0-9.,]/g, '');
  const hasDecimal = target.includes('.');
  const formatted = hasDecimal
    ? count.toFixed(1)
    : Math.floor(count).toLocaleString();

  return formatted + suffix;
}

function StatCounter({ value, label }) {
  const display = useCounter(value);
  return (
    <div className="home-stat">
      <span className="home-stat-value">{display}</span>
      <span className="home-stat-label">{label}</span>
    </div>
  );
}

function ImpactScoreBadge({ score }) {
  if (score === null) {
    return (
      <div className="home-impact-badge home-impact-pending">
        <span className="home-impact-label">IMPACT SCORE</span>
        <span className="home-impact-value">Pending</span>
      </div>
    );
  }

  const maxScore = 10;
  let level = 'low';
  if (score >= 7) level = 'high';
  else if (score >= 4) level = 'medium';
  return (
    <div className={`home-impact-badge home-impact-${level}`}>
      <span className="home-impact-label">IMPACT SCORE</span>
      <span className="home-impact-value">{score.toFixed(1)} / {maxScore}</span>
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const { isAuthenticated, logoutUser, workspacePath } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [featuredSignals, setFeaturedSignals] = useState(FEATURED_SIGNAL_FALLBACKS);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [searchFocused, setSearchFocused] = useState(false);
  const {
    loading: suggestionsLoading,
    suggestions: signalSuggestions,
  } = useSignalSuggestions(searchQuery, searchFocused);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setIsVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const loadFeaturedSignals = useCallback(async () => {
    setFeaturedLoading(true);
    try {
      const nextSignals = await fetchFeaturedSignals();
      if (nextSignals.length > 0) {
        setFeaturedSignals(nextSignals);
      }
    } catch (error) {
      console.error('Failed to load featured signals', error);
      setFeaturedSignals(FEATURED_SIGNAL_FALLBACKS);
    } finally {
      setFeaturedLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadInitialFeaturedSignals() {
      try {
        const nextSignals = await fetchFeaturedSignals();
        if (isMounted && nextSignals.length > 0) {
          setFeaturedSignals(nextSignals);
        }
      } catch (error) {
        console.error('Failed to load featured signals', error);
        if (isMounted) {
          setFeaturedSignals(FEATURED_SIGNAL_FALLBACKS);
        }
      } finally {
        if (isMounted) {
          setFeaturedLoading(false);
        }
      }
    }

    loadInitialFeaturedSignals();
    return () => { isMounted = false; };
  }, []);

  function handleLogout() {
    logoutUser();
    navigate('/login', { replace: true });
  }

  function runSearch(value) {
    navigate(buildSignalSearchPath(value));
  }

  function handleSearchSubmit(event) {
    event.preventDefault();
    runSearch(searchQuery);
  }

  function handleSearchBlur(event) {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setSearchFocused(false);
    }
  }

  return (
    <div className="home-page">
      {/* Navigation Bar */}
      <nav className="home-navbar">
        <div className="home-navbar-inner">
          <Link to="/" className="home-navbar-brand">
            <Logo size={70} style={{ marginRight: '12px' }} />
            <div className="home-navbar-brand-text">
              <span className="home-navbar-brand-name">Blue Horizon</span>
              <span className="home-navbar-brand-sub">STRATEGIC FORESIGHT</span>
            </div>
          </Link>

          <div className="home-navbar-links">
            <Link to="/signals" className="home-navbar-link">Signal Bank</Link>
            <Link to="/workshop" className="home-navbar-link">Workshop</Link>
          </div>

          <div className="home-navbar-actions">
            {isAuthenticated ? (
              <>
                <Link to={workspacePath} className="home-navbar-btn-signup">Open Workspace</Link>
                <button type="button" className="btn btn-secondary" onClick={handleLogout}>
                  Log Out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="home-navbar-link">Log In</Link>
                <Link to="/signup" className="home-navbar-btn-signup">Sign Up</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className={`home-hero ${isVisible ? 'home-hero--visible' : ''}`}>
        <div className="home-hero-bg">
          <div className="home-hero-orb home-hero-orb--1" />
          <div className="home-hero-orb home-hero-orb--2" />
          <div className="home-hero-orb home-hero-orb--3" />
        </div>
        <div className="home-hero-content">
          <h1 className="home-hero-title">
            Unlock the Power of<br />
            <em className="home-hero-highlight">Strategic Foresight</em>
          </h1>
          <p className="home-hero-subtitle">
            Explore thousands of signal and high value insight to<br />
            build the future of strategic foresight.
          </p>

          <div className="home-search-shell" onBlur={handleSearchBlur}>
            <form className="home-hero-search" onSubmit={handleSearchSubmit}>
              <Search className="home-hero-search-icon" size={20} />
              <input
                type="text"
                placeholder="Search for Signal"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                id="home-search-input"
              />
              <button type="submit" className="home-hero-search-btn">
                Search
              </button>
            </form>
            <SignalSearchSuggestions
              examples={POPULAR_SEARCHES}
              loading={suggestionsLoading}
              onSearch={runSearch}
              onSelectSignal={(signal) => navigate(`/signals/${signal.id}`)}
              query={searchQuery}
              suggestions={signalSuggestions}
              visible={searchFocused}
            />
          </div>

          <div className="home-hero-popular">
            <span>Popular:</span>
            {POPULAR_SEARCHES.map((term) => (
              <Link key={term} to={buildSignalSearchPath(term)} className="home-hero-popular-tag">
                {term}
              </Link>
            ))}
          </div>
        </div>

        {/* wave divider */}
        <div className="home-hero-wave">
          <svg viewBox="0 0 1440 120" preserveAspectRatio="none">
            <path
              d="M0,60 C360,120 1080,0 1440,60 L1440,120 L0,120 Z"
              fill="#f5f7fa"
            />
          </svg>
        </div>
      </section>

      {/* Signal Domain Section */}
      <section className="home-section home-domains-section">
        <div className="home-section-container">
          <div className="home-section-header">
            <div>
              <h2 className="home-section-title">Explore by Signal Domain</h2>
              <p className="home-section-desc">
                Monitor and evaluate emerging trends across strategic landscape.
              </p>
            </div>
            <Link to="/signals" className="home-view-all">
              View all categories <ArrowRight size={16} />
            </Link>
          </div>

          <div className="home-domains-grid">
            {SIGNAL_DOMAINS.map((domain) => (
              <Link
                key={domain.label}
                to={`/signals?pestel=${domain.pestel}`}
                className="home-domain-card"
              >
                <div
                  className="home-domain-icon"
                  style={{ background: `${domain.color}14`, color: domain.color }}
                >
                  <domain.icon size={24} />
                </div>
                <h3 className="home-domain-name">{domain.label}</h3>
                <p className="home-domain-desc">{domain.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Platform Stats Section */}
      <section className="home-section home-stats-section">
        <div className="home-section-container">
          <h2 className="home-stats-title">Platform at a Glance</h2>
          <p className="home-stats-subtitle">
            Real-time engagement across our open data ecosystem.
          </p>
          <div className="home-stats-grid">
            {PLATFORM_STATS.map((stat) => (
              <StatCounter key={stat.label} value={stat.value} label={stat.label} />
            ))}
          </div>
        </div>
      </section>

      {/* Featured Datasets Section */}
      <section className="home-section home-featured-section">
        <div className="home-section-container">
          <div className="home-section-header">
            <h2 className="home-section-title">Featured Datasets</h2>
            <button
              className="home-refresh-btn"
              id="featured-refresh-btn"
              type="button"
              onClick={loadFeaturedSignals}
              disabled={featuredLoading}
            >
              {featuredLoading ? 'Refreshing' : 'Refresh'} <RefreshCw size={14} />
            </button>
          </div>

          <div className="home-featured-grid">
            {featuredSignals.map((signal) => (
              <div key={`${signal.title}-${signal.id || 'fallback'}`} className="home-featured-card">
                <div className="home-featured-card-top">
                  <div className="home-featured-tags">
                    {signal.categories.map((cat) => (
                      <span key={cat.label} className={`home-cat-badge home-cat-${cat.color}`}>
                        {cat.label}
                      </span>
                    ))}
                  </div>
                  <ImpactScoreBadge score={signal.impactScore} />
                </div>
                <h3 className="home-featured-title">{signal.title}</h3>
                <p className="home-featured-desc">{signal.description}</p>
                <div className="home-featured-card-bottom">
                  <span className="home-featured-votes">
                    <ThumbsUp size={14} /> {signal.votes} Votes
                  </span>
                  <Link to={signal.detailPath} className="home-featured-link">
                    {signal.id ? 'View Details' : 'Open Signal Bank'}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="home-footer">
        <div className="home-footer-inner">
          <div className="home-footer-grid">
            {/* Brand */}
            <div className="home-footer-brand">
              <div className="home-footer-logo" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <Logo size={46} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span className="home-footer-brand-name" style={{ fontSize: '1.25rem', fontWeight: 700 }}>Blue Horizon</span>
                  <span className="home-footer-brand-sub" style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', letterSpacing: '0.05em' }}>STRATEGIC FORESIGHT</span>
                </div>
              </div>
              <p className="home-footer-about">
                Blue Horizon is the central portal for national open data.
                We empower developers, researchers, and citizens to
                drive insight and innovation through transparency.
              </p>
            </div>

            {/* Platform links */}
            <div className="home-footer-col">
              <h4>PLATFORM</h4>
              <Link to="/signals">All Datasets</Link>
              <Link to="/signals">API Documentation</Link>
              <Link to="/signals">Data Visualizations</Link>
              <Link to="/signals">Release Notes</Link>
            </div>

            {/* Legal links */}
            <div className="home-footer-col">
              <h4>LEGAL</h4>
              <Link to="/signals">Privacy Policy</Link>
              <Link to="/signals">Terms of Use</Link>
              <Link to="/signals">Data License</Link>
              <Link to="/signals">Contact Us</Link>
            </div>
          </div>

          <div className="home-footer-bottom">
            <p>&copy; 2024 Blue Horizon Strategic Foresight Platform. All rights reserved.</p>
            <div className="home-footer-social">
              <a href="#" aria-label="Twitter"><TwitterIcon size={18} /></a>
              <a href="#" aria-label="GitHub"><GithubIcon size={18} /></a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
