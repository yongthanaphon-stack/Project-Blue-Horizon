# Login Home Radar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Login and Sign Up pages visually continuous with the Home page and add a minimal static strategic radar accent.

**Architecture:** Keep this as a frontend-only change. Extract Home's public navbar into a shared component, update Login and Sign Up markup with the shared navbar plus a Home-like hero/form composition, then keep the auth-specific styling in `Login.css`.

**Tech Stack:** Vite React, JavaScript/JSX, CSS modules by page convention, lucide-react, existing global CSS variables.

---

## Files

- Modify: `frontend/src/pages/Auth/Login/index.jsx`
  - Add shared public navbar and hero structure.
  - Use shared code-native clean minimal radar markup.
  - Preserve login form behavior and improve redirect logic.
- Modify: `frontend/src/pages/Auth/Signup/index.jsx`
  - Reuse the same public navbar, hero, static radar, form card, and primary CTA language.
  - Preserve signup validation and submit behavior.
- Modify: `frontend/src/pages/Auth/Login/Login.css`
  - Add `.auth-container--login` scoped Home-continuity styles.
  - Style both Login and the modern Sign Up variant.
- Modify: `frontend/src/pages/Home/index.jsx`
  - Replace inline public navbar markup with the shared component.
- Create: `frontend/src/components/PublicNavbar.jsx`
  - Reuse Home's public brand/nav/action structure.
- Create: `frontend/src/components/PublicNavbar.css`
  - Own the shared Home/Login public navbar styling.
- Create: `frontend/src/components/AuthRadarPreview.jsx`
  - Provide a reusable static radar preview for auth pages.
- Create/modify: `.gitignore`
  - Ignore `.superpowers/` visual companion artifacts.

## Task 1: Login Markup And Redirects

- [x] Update imports in `frontend/src/pages/Auth/Login/index.jsx`:

```jsx
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Activity, Eye, EyeOff, LockKeyhole, Mail, Radar, Sparkles } from 'lucide-react';
import { getWorkspacePathForRole } from '../../../utils/roles';
import PublicNavbar from '../../../components/PublicNavbar';
```

- [x] Add `useLocation()` and safe redirect selection:

```jsx
const location = useLocation();
const redirectTo = typeof location.state?.from === 'string' && location.state.from.startsWith('/')
  ? location.state.from
  : null;
```

- [x] Change success navigation:

```jsx
navigate(redirectTo || getWorkspacePathForRole(res.data.user?.role), { replace: true });
```

- [x] Replace the old split `auth-shell` markup with:
  - shared `PublicNavbar`
  - `auth-login-hero`
  - `auth-login-copy`
  - `auth-radar-panel`
  - `auth-login-card`
  - existing form fields and controls

## Task 2: Login-Scoped Styling

- [x] Append Login-specific CSS to `frontend/src/pages/Auth/Login/Login.css`.
- [x] Scope new layout rules under `.auth-container--login`.
- [x] Reuse Home tokens:

```css
--auth-home-primary: var(--color-primary-500, #3182ce);
--auth-home-primary-dark: var(--color-primary-700, #1a365d);
--auth-home-bg: var(--bg-body, #f5f7fa);
```

- [x] Define radar classes:
  - `.auth-radar-panel`
  - `.auth-radar-orbit`
  - `.auth-radar-rings`
  - `.auth-radar-sweep`
  - `.auth-radar-node`

- [x] Add responsive breakpoints at `980px`, `720px`, and `560px`.
- [x] Keep the hero motion accessible and remove radar-specific animation.
- [x] Remove animated radar sweep and keep the radar static.
- [x] Redesign Sign Up with the same Home-continuity auth system.
- [x] Update public nav unauthenticated links so Signal Bank and Workshop route to reachable Home anchors; Home action replaces Log In.

## Task 3: Ignore Visual Companion Artifacts

- [x] Add root `.gitignore` entry:

```gitignore
.superpowers/
```

## Task 4: Verification

- [x] Run frontend lint:

```bash
cd frontend && npm run lint
```

Expected: exit code 0.

- [x] Run frontend build:

```bash
cd frontend && npm run build
```

Expected: exit code 0.

- [x] Render QA `/login` at desktop and mobile:
  - desktop: `1440x1000`
  - mobile: `390x900`
  - verify page title, meaningful auth content, no framework overlay, no horizontal overflow, no relevant console errors.

- [x] Exercise interactions:
  - fill email
  - fill password
  - toggle remember me
  - toggle password visibility

- [x] Check `/signup` quickly because it imports `../Login/Login.css`.

Expected: Sign Up still renders meaningful content with no framework overlay.
