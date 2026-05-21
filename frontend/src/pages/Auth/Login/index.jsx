import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { loginFailure, loginStart, loginSuccess } from '../../../app/store/slices/authSlice';
import { authApi } from '../../../api/api';
import { clearRedirectPath } from '../../../utils/authStorage';
import { Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react';
import Logo from '../../../components/Logo';
import './Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();

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
      navigate('/', { replace: true });
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
      <main className="auth-shell">
        <section className="auth-brand-panel" aria-label="Blue Horizon">
          <div className="auth-brand-content">
            <div className="auth-logo-lockup">
              <div className="auth-logo-mark">
                <Logo size={58} className="auth-logo-icon" />
              </div>
              <div>
                <span className="auth-brand-name">BLUE HORIZON</span>
                <span className="auth-brand-subtitle">Strategic foresight workspace</span>
              </div>
            </div>

            <div className="auth-horizon-visual" aria-hidden="true">
              <div className="auth-horizon-orbit">
                <span className="auth-horizon-line" />
                <span className="auth-horizon-line" />
                <span className="auth-horizon-line" />
                <span className="auth-horizon-node" />
                <span className="auth-horizon-node" />
                <span className="auth-horizon-node" />
              </div>
            </div>

            <p className="auth-brand-caption">Navigate the horizon with clarity.</p>
          </div>
        </section>

        <section className="auth-form-panel" aria-label="Log in">
          <div className="auth-form-card">
            <div className="auth-switch">
              <span>New here?</span>
              <Link to="/signup" className="auth-link">Create account</Link>
            </div>

            <div className="auth-header">
              <h2>Welcome to Blue Horizon</h2>
              <p>Log in to continue to your Blue Horizon workspace.</p>
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
                <span>{saving ? 'Logging in...' : 'Log in'}</span>
              </button>
            </form>

          </div>
        </section>
      </main>
    </div>
  );
};

export default Login;
