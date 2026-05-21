import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { loginFailure, loginStart, loginSuccess } from '../../../app/store/slices/authSlice';
import { authApi } from '../../../api/api';
import { getWorkspacePathForRole } from '../../../utils/roles';
import { Eye, EyeOff, LockKeyhole, Mail, Sparkles, UserRound } from 'lucide-react';
import AuthRadarPreview from '../../../components/AuthRadarPreview';
import PublicNavbar from '../../../components/PublicNavbar';
import '../Login/Login.css';

const Signup = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const redirectTo = typeof location.state?.from === 'string' && location.state.from.startsWith('/')
    ? location.state.from
    : null;

  const handleSignup = async (e) => {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();

    if (trimmedName.length < 2) {
      setError('Please enter your full name.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!terms) {
      setError('Please accept the terms and policy.');
      return;
    }

    setSaving(true);
    setError('');
    dispatch(loginStart());

    try {
      const res = await authApi.signup({ name: trimmedName, email: normalizedEmail, password });
      const payload = {
        ...res.data,
        user: { ...res.data.user },
      };
      dispatch(loginSuccess(payload));
      navigate(redirectTo || getWorkspacePathForRole(payload.user?.role), { replace: true });
    } catch (err) {
      const message = err.response?.data?.message || 'Unable to create account. Please try again.';
      const normalizedMessage = Array.isArray(message) ? message.join(' ') : message;
      setError(normalizedMessage);
      dispatch(loginFailure(normalizedMessage));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="auth-container auth-container--login auth-container--signup-modern">
      <PublicNavbar />

      <main className="auth-login-hero auth-signup-hero">
        <div className="auth-login-hero-bg" aria-hidden="true" />
        <div className="auth-login-layout">
          <section className="auth-login-copy" aria-label="Blue Horizon account introduction">
            <h1 className="auth-login-title">
              Create your<br />
              <em>Foresight Workspace</em>
            </h1>
            <p className="auth-login-subtitle">
              Start curating signals, coordinating workshops, and turning uncertainty into strategic clarity.
            </p>
            <AuthRadarPreview
              title="Workspace signal map"
              description="A clean view for scanning and workshop planning."
            />
          </section>

          <section className="auth-login-card auth-signup-card" aria-label="Sign up">
            <div className="auth-login-card-switch">
              <span>Already joined?</span>
              <Link to="/login" className="auth-link">Log in</Link>
            </div>

            <div className="auth-header">
              <h2>Create account</h2>
              <p>Set up your Blue Horizon access in a few seconds.</p>
            </div>

            <form onSubmit={handleSignup} className="auth-form">
              <div className="input-group">
                <label className="auth-field-label" htmlFor="name">Full name</label>
                <div className="input-wrapper">
                  <span className="input-leading-icon" aria-hidden="true">
                    <UserRound size={18} />
                  </span>
                  <input
                    type="text"
                    id="name"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    required
                  />
                </div>
              </div>

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
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
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
              </div>

              <div className="input-group">
                <label className="auth-field-label" htmlFor="confirm-password">Confirm password</label>
                <div className="input-wrapper">
                  <span className="input-leading-icon" aria-hidden="true">
                    <LockKeyhole size={18} />
                  </span>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirm-password"
                    placeholder="Repeat your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    className="show-password-btn"
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="terms-container">
                <input
                  type="checkbox"
                  id="terms"
                  checked={terms}
                  onChange={(e) => setTerms(e.target.checked)}
                />
                <label htmlFor="terms">I accept terms and policy</label>
              </div>

              {error && <div className="auth-error">{error}</div>}

              <button type="submit" className="auth-button" disabled={saving}>
                <Sparkles size={17} aria-hidden="true" />
                <span>{saving ? 'Creating account...' : 'Create account'}</span>
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

export default Signup;
