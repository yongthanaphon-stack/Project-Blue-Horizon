import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Logo from './Logo';
import './PublicNavbar.css';

export default function PublicNavbar() {
  const navigate = useNavigate();
  const { isAuthenticated, logoutUser, workspacePath } = useAuth();
  const navLinks = isAuthenticated
    ? [
        { label: 'Signal Bank', to: '/signals' },
        { label: 'Workshop', to: '/workshop' },
      ]
    : [
        { label: 'Signal Bank', to: '/#signal-bank' },
        { label: 'Workshop', to: '/#workshop' },
      ];

  function handleLogout() {
    logoutUser();
    navigate('/login', { replace: true });
  }

  return (
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
          {navLinks.map((link) => (
            <Link key={link.label} to={link.to} className="home-navbar-link">
              {link.label}
            </Link>
          ))}
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
              <Link to="/" className="home-navbar-link">Home</Link>
              <Link to="/signup" className="home-navbar-btn-signup">Sign Up</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
