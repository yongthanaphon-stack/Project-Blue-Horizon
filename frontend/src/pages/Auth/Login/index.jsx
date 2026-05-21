import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { loginFailure, loginStart, loginSuccess } from '../../../app/store/slices/authSlice';
import { authApi } from '../../../api/api';
import { clearRedirectPath } from '../../../utils/authStorage';
import { Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react';
import { getWorkspacePathForRole } from '../../../utils/roles';
import AuthRadarPreview from '../../../components/AuthRadarPreview';
import PublicNavbar from '../../../components/PublicNavbar';
import './Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const redirectTo = typeof location.state?.from === 'string' && location.state.from.startsWith('/')
    ? location.state.from
    : null;

  const handleLogin = async (e) => {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setSaving(true);
    setError('');
    dispatch(loginStart());

    try {
      const res = await authApi.login({ email: normalizedEmail, password });
      dispatch(loginSuccess(res.data));
      clearRedirectPath();
      navigate(redirectTo || getWorkspacePathForRole(res.data.user?.role), { replace: true });
    } catch (err) {
      const message = err.response?.data?.message || 'Unable to sign in. Please try again.';
      setError(message);
      dispatch(loginFailure(message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="auth-container auth-container--login">
      <PublicNavbar />

      <main className="auth-login-hero">
        <div className="auth-login-hero-bg" aria-hidden="true" />
        <div className="auth-login-layout">
          <section className="auth-login-copy" aria-label="Blue Horizon login introduction">
            <h1 className="auth-login-title">
              Unlock the Power of<br />
              <em>Strategic Foresight</em>
            </h1>
            <p className="auth-login-subtitle">
              Log in to continue scanning signals, building workshops, and turning foresight into strategic action.
            </p>
            <AuthRadarPreview />
          </section>

          <section className="auth-login-card" aria-label="Log in">
            <div className="auth-login-card-switch">
              <span>New here?</span>
              <Link to="/signup" className="auth-link">Create account</Link>
            </div>

            <div className="auth-header">
              <h2>Welcome to Blue Horizon</h2>
              <p>Use your Blue Horizon account to enter the foresight workspace.</p>
            </div>

            <form onSubmit={handleLogin} className="auth-form">
              <div className="input-group">
                <label className="auth-field-label" htmlFor="email">Email</label>
                <div className="input-wrapper">
                  <span className="input-leading-icon" aria-hidden="true">
                    <Mail size={18} />
                  </span>
                  <input
                    type="email"
                    id="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label className="auth-field-label" htmlFor="password">Password</label>
                <div className="input-wrapper">
                  <span className="input-leading-icon" aria-hidden="true">
                    <LockKeyhole size={18} />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    className="show-password-btn"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <div className="login-options-row">
                  <div className="terms-container">
                    <input
                      type="checkbox"
                      id="remember"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <label htmlFor="remember">Remember me</label>
                  </div>
                  <div className="forgot-password-container">
                    <a href="#" className="forgot-password">Forgot password?</a>
                  </div>
                </div>
              </div>

              {error && <div className="auth-error">{error}</div>}

              <button type="submit" className="auth-button" disabled={saving}>
                <span>{saving ? 'Connecting...' : 'Log in'}</span>
              </button>
            </form>
          </section>
        </div>

        <div className="auth-login-wave" aria-hidden="true">
          <svg viewBox="0 0 1440 120" preserveAspectRatio="none">
            <path
              d="M0,60 C360,120 1080,0 1440,60 L1440,120 L0,120 Z"
              fill="#f5f7fa"
            />
          </svg>
        </div>
      </main>
    </div>
  );
};

export default Login;
