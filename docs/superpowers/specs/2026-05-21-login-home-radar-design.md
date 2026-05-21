# Login Home Radar Redesign Spec

## Goal

Redesign the Login and Sign Up pages so they feel like the same product surface as the Home page, while adding a minimal static strategic radar accent that reinforces the Blue Horizon environmental scanning identity.

## Approved Direction

Use **Home Hero Continuity + Minimal Strategic Radar**.

The auth pages should reuse the Home page's light navigation, navy-to-blue hero gradient, white surfaces, Google Sans Flex typography, existing radius scale, and primary blue button language. The radar should be subtle, static, and secondary, not a cyberpunk or neon centerpiece.

## Scope

In scope:

- Redesign `frontend/src/pages/Auth/Login/index.jsx`.
- Redesign `frontend/src/pages/Auth/Signup/index.jsx` with the same auth hero/card system.
- Extract the Home top navigation into a shared `PublicNavbar` component and reuse it on both Home and Login.
- Add Login-specific styles in `frontend/src/pages/Auth/Login/Login.css`.
- Preserve Sign Up form behavior while aligning its design with Login.
- Preserve login submit behavior, Redux auth state, error handling, and password visibility toggle.
- Improve post-login navigation by honoring a protected-route redirect when present, otherwise using role-based workspace routing.
- Ignore `.superpowers/` visual companion artifacts in git.

Out of scope:

- Backend auth changes.
- Social login.
- New image assets.

## Visual System

- Font: `var(--font-sans)`, currently Google Sans Flex.
- Background: Home-style gradient using `--color-primary-900`, `--color-primary-700`, `--color-primary-600`, and `--color-primary-400`.
- Surfaces: white cards using `--bg-surface`, `--border-color`, and existing shadow/radius tokens.
- Buttons: primary blue matching Home search/signup button treatment.
- Form fields: light surface, 12px radius, blue focus ring, lucide icons.
- Motion: subtle fade/slide on the hero only. Radar remains static.

## Layout

Desktop:

- A white nav bar at the top is the same shared component used by Home.
- The hero fills the first viewport under the nav.
- Left side contains the login-facing headline, supporting copy, and a minimal radar/scanning panel.
- Right side contains the white login card with email, password, remember me, forgot password, CTA, and Sign Up link.
- The bottom uses the same soft wave transition into the page background as Home.

Mobile:

- Nav condenses to brand + Sign Up action.
- Hero stacks vertically.
- Radar becomes compact and does not compete with the form.
- No horizontal overflow.

## Radar Accent

The radar is code-native HTML/CSS:

- 2-3 circular rings.
- 3 small signal nodes.
- No dot texture or heavy data chips; keep the orbit, rings, and copy sparse.
- Small status text such as "Environmental scan active".

It must use only the Home/system blue palette and white translucency.

## Acceptance Criteria

- Login visually reads as part of the Home page rather than a separate auth template.
- Desktop and mobile render without horizontal overflow.
- Form controls remain usable and accessible.
- Existing login success, error, remember me, and show/hide password interactions still work.
- Frontend lint and build pass.
- Browser QA verifies `/login` desktop and mobile screenshots, no framework overlay, no relevant console errors, and at least one interaction path.
