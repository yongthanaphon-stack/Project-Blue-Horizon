import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Home, Database, TrendingUp, LayoutDashboard, Users, Settings, Search, UserRound, LogOut, Menu, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import NotificationCenter from './feedback/NotificationCenter';
import Logo from './Logo';
import UserIdentityBlock from './UserIdentityBlock';
import { useAuth } from '../hooks/useAuth';
import { useSignalSuggestions } from '../hooks/useSignalSuggestions';
import SignalSearchSuggestions from './Signals/SignalSearchSuggestions';

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/signals', icon: Database, label: 'Signal Bank' },
  { to: '/workshop', icon: TrendingUp, label: 'Workshop' },
];

const adminItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/users', icon: Users, label: 'User Management' },
];

const GLOBAL_SEARCH_EXAMPLES = ['AI Healthcare', 'Carbon Credits', 'Urban Planning', 'Freelancing'];

function buildSignalSearchPath(value) {
  const search = value.trim();
  if (!search) return '/signals';

  const params = new URLSearchParams({ search });
  return `/signals?${params.toString()}`;
}

export default function Layout({ children }) {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [globalSearchDraft, setGlobalSearchDraft] = useState({ source: '', value: '' });
  const [isGlobalSearchFocused, setIsGlobalSearchFocused] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { canViewAdmin, logoutUser, roleLabel, user } = useAuth();
  const displayName = user?.name || 'Dr. Alex Miller';
  const displayEmail = user?.email || '';
  const showSignalTip = location.pathname === '/signals/new' || /^\/signals\/[^/]+$/.test(location.pathname);
  const isWorkshopCanvas = /^\/workshop\/[^/]+\/radar$/.test(location.pathname);
  const currentGlobalSearch = location.pathname === '/signals'
    ? new URLSearchParams(location.search).get('search') || new URLSearchParams(location.search).get('q') || ''
    : '';
  const globalSearch = globalSearchDraft.source === currentGlobalSearch
    ? globalSearchDraft.value
    : currentGlobalSearch;
  const {
    loading: globalSuggestionsLoading,
    suggestions: globalSignalSuggestions,
  } = useSignalSuggestions(globalSearch, isGlobalSearchFocused);

  function handleLogout() {
    logoutUser();
    navigate('/login', { replace: true });
  }

  function handleGlobalSearchSubmit(event) {
    event.preventDefault();
    runGlobalSearch(globalSearch);
  }

  function handleGlobalSearchChange(event) {
    setGlobalSearchDraft({ source: currentGlobalSearch, value: event.target.value });
  }

  function runGlobalSearch(value) {
    setIsGlobalSearchFocused(false);
    navigate(buildSignalSearchPath(value));
  }

  function selectGlobalSearchSignal(signal) {
    setIsGlobalSearchFocused(false);
    navigate(`/signals/${signal.id}`);
  }

  function handleGlobalSearchBlur(event) {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsGlobalSearchFocused(false);
    }
  }

  if (isWorkshopCanvas) {
    return (
      <div className="canvas-layout">
        <header className="canvas-topbar">
          <Link to="/" className="canvas-brand">
            <div className="canvas-brand-icon">
              <Logo size={50} />
            </div>
            <div>
              <h1>Blue Horizon</h1>
              <span>STRATEGIC FORESIGHT</span>
            </div>
          </Link>

          <div className="canvas-topbar-actions">
            <form className="canvas-search-bar" onBlur={handleGlobalSearchBlur} onSubmit={handleGlobalSearchSubmit}>
              <button type="submit" className="canvas-search-submit" aria-label="Search signals">
                <Search />
              </button>
              <input
                type="search"
                placeholder="Search signals..."
                aria-label="Search signals"
                value={globalSearch}
                onChange={handleGlobalSearchChange}
                onFocus={() => setIsGlobalSearchFocused(true)}
              />
              <SignalSearchSuggestions
                examples={GLOBAL_SEARCH_EXAMPLES}
                loading={globalSuggestionsLoading}
                onSearch={runGlobalSearch}
                onSelectSignal={selectGlobalSearchSignal}
                query={globalSearch}
                suggestions={globalSignalSuggestions}
                visible={isGlobalSearchFocused}
              />
            </form>
            <NotificationCenter />
            <span className="canvas-user-avatar" aria-label={displayName} />
          </div>
        </header>

        <main className="canvas-main">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className={`app-layout ${isSidebarOpen ? 'sidebar-open' : ''}`}>
      <button
        type="button"
        className="mobile-sidebar-backdrop"
        aria-label="Close navigation"
        onClick={() => setSidebarOpen(false)}
      />
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon" style={{ background: 'transparent', width: 'auto', height: 'auto' }}>
            <Logo size={55} />
          </div>
          <div>
            <h1>Blue Horizon</h1>
            <span>STRATEGIC FORESIGHT</span>
          </div>
          <button type="button" className="sidebar-close-btn" onClick={() => setSidebarOpen(false)} aria-label="Close navigation">
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `sidebar-link ${isActive || (item.to === '/signals' && location.pathname.startsWith('/signal')) ? 'active' : ''}`
              }
            >
              <item.icon />
              {item.label}
            </NavLink>
          ))}

          {canViewAdmin && (
            <>
              <div className="sidebar-section-label">Administration</div>

              {adminItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                >
                  <item.icon />
                  {item.label}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        {showSignalTip && (
          <div className="pro-tip sidebar-context-tip">
            <div className="pro-tip-label">Pro Tip</div>
            <p>Regularly update signal impacts to maintain accurate radar mapping.</p>
          </div>
        )}

        <div className="sidebar-user">
          <button
            type="button"
            className="sidebar-user-menu-btn"
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            aria-label="User menu"
            aria-expanded={isUserMenuOpen}
          >
            <UserIdentityBlock
              email={displayEmail}
              name={displayName}
              roleLabel={roleLabel}
              variant="sidebar"
            />
            {isUserMenuOpen ? (
              <ChevronDown size={20} strokeWidth={2.2} />
            ) : (
              <ChevronUp size={20} strokeWidth={2.2} />
            )}
          </button>

          {isUserMenuOpen && (
            <div className="sidebar-user-dropdown">
              <div className="sidebar-user-dropdown-info">
                <p>{displayName}</p>
                <span>{roleLabel}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigate('/profile');
                  setIsUserMenuOpen(false);
                }}
              >
                <UserRound size={16} />
                My Profile
              </button>
              <button
                type="button"
                onClick={() => {
                  navigate('/settings');
                  setIsUserMenuOpen(false);
                }}
              >
                <Settings size={16} />
                Settings
              </button>
              <button
                type="button"
                className="danger"
                onClick={() => {
                  handleLogout();
                  setIsUserMenuOpen(false);
                }}
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="main-wrapper">
        <header className="topbar">
          <button type="button" className="topbar-menu-btn" onClick={() => setSidebarOpen(true)} aria-label="Open navigation">
            <Menu size={21} />
          </button>
          <form className="search-bar" onBlur={handleGlobalSearchBlur} onSubmit={handleGlobalSearchSubmit}>
            <button type="submit" className="search-bar-submit" aria-label="Search signals">
              <Search />
            </button>
            <input
              type="search"
              placeholder="Search signals, trends, or PESTEL categories..."
              id="global-search"
              value={globalSearch}
              onChange={handleGlobalSearchChange}
              onFocus={() => setIsGlobalSearchFocused(true)}
            />
            <SignalSearchSuggestions
              examples={GLOBAL_SEARCH_EXAMPLES}
              loading={globalSuggestionsLoading}
              onSearch={runGlobalSearch}
              onSelectSignal={selectGlobalSearchSignal}
              query={globalSearch}
              suggestions={globalSignalSuggestions}
              visible={isGlobalSearchFocused}
            />
          </form>
          <div className="topbar-actions">
            <NotificationCenter />
            <button
              type="button"
              className={`topbar-icon-btn ${location.pathname === '/settings' ? 'active' : ''}`}
              id="settings-btn"
              aria-label="Settings"
              onClick={() => navigate('/settings')}
            >
              <Settings size={20} />
            </button>

          </div>
        </header>

        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
