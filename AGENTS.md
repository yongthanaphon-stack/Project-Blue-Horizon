# AGENTS.md

Guidance for coding agents working in this repository.

## Project Overview

Blue Horizon is a full-stack strategic foresight workspace for signal scanning,
workshops, scenario generation, SWOT analysis, and admin/user management.

- `backend/`: NestJS 11 API written in TypeScript.
- `frontend/`: Vite React app written in JavaScript/JSX.
- `docker-compose.yml`: local PostgreSQL 16 service for development.
- There is no root `package.json`; run npm commands inside `backend/` or
  `frontend/`.

## First Checks

- Run `git status --short` before editing. Preserve user changes and do not
  revert unrelated work.
- Prefer `rg` / `rg --files` for searches.
- Use `npm`; both apps have `package-lock.json`. Do not introduce yarn, pnpm,
  or bun unless explicitly requested.
- Keep generated or local-only files out of commits: `.env`, `node_modules/`,
  `dist/`, coverage output, and ad hoc scratch data.

## Local Setup

From the repository root:

```sh
docker compose up -d postgres
```

Backend setup:

```sh
cd backend
npm install
cp .env.example .env
npx prisma generate
npx prisma db push
npx prisma db seed
npm run start:dev
```

Frontend setup:

```sh
cd frontend
npm install
npm run dev
```

Default local ports:

- API: `http://localhost:3001`
- API routes are prefixed with `/api`.
- Frontend: Vite default, usually `http://localhost:5173`.
- Database: PostgreSQL on `localhost:5432`.
- Prisma Studio: `cd backend && npm run studio`.

## Verification Commands

Backend:

```sh
cd backend
npm run build
npm test
npm run test:e2e
```

Frontend:

```sh
cd frontend
npm run lint
npm run build
```

Notes:

- `backend npm run lint` runs ESLint with `--fix`; use it intentionally and
  review the resulting diff.
- Backend e2e/database checks require PostgreSQL and a valid `backend/.env`.
- The frontend currently has lint/build scripts but no automated test script.

## Backend Conventions

- Follow the existing NestJS module layout:
  `src/modules/<feature>/<feature>.module.ts`,
  `src/modules/<feature>/<feature>.controller.ts`,
  `src/modules/<feature>/<feature>.service.ts`, and
  `src/modules/<feature>/dto/*.dto.ts`.
- App-level NestJS files live in `src/app/`.
- Core shared infrastructure lives in `src/core/`; Prisma lives in
  `src/core/prisma/`.
- Controllers use route prefixes like `@Controller('api/signals')`.
- Use `ParseIntPipe` for numeric route/query params where appropriate.
- Validate incoming data with DTO classes and `class-validator`. The global
  `ValidationPipe` enables `transform` and `whitelist`.
- Access the database through `PrismaService`; do not create extra Prisma
  clients in application services.
- Keep Prisma enum values aligned with `backend/prisma/schema.prisma`:
  `SignalStatus`, `ImpactLevel`, `TimeHorizon`, `PestelCategory`, and
  `UserRole`.
- For user-authenticated routes, use `JwtGuard` and `AuthenticatedRequest`
  from `src/modules/auth/jwt.guard.ts`.
- Do not reintroduce demo-token shortcuts. Auth is JWT-based.
- Sanitize free-form user-visible signal text using the existing
  DOMPurify/JSDOM pattern before persistence.
- Signals use soft delete via `deletedAt`; avoid hard-deleting signals unless a
  task explicitly requires it.
- Preserve signal history entries for create/update/delete style mutations.
- Keep vote behavior consistent: users cannot vote for their own signal, votes
  are upserted per `(signalId, userId)`, and `impactScore` is the vote average.
- If changing Prisma schema, update `schema.prisma` and coordinate database
  state with `npx prisma db push` or a migration. Avoid destructive resets
  unless explicitly approved.

## Frontend Conventions

- The frontend is React 19 with Vite and JavaScript/JSX, not TypeScript.
- Routes live in `src/app/App.jsx` and `src/app/routes/`.
- API calls are centralized in `src/api/api.js`; reuse the exported API
  clients instead of scattering raw axios calls across pages.
- Auth state lives in Redux Toolkit under
  `src/app/store/slices/authSlice.js`.
  Local storage keys are `blueHorizonUser` and `blueHorizonToken`.
- Use `src/constants/roles.js` for admin checks. Admin roles are `ADMIN` and
  `ADMIN_SYSTEM`.
- Keep UI copy in English unless a task explicitly asks for localization.
- Use existing CSS variables and layout classes in `src/styles/global.css`.
  Page-specific CSS should stay beside the page component when that pattern
  already exists.
- Use `lucide-react` for icons when an icon is needed.
- Preserve responsive behavior for the sidebar, canvas workshop layout, and
  route-level authenticated redirects.

## Domain Notes

- A global signal in the Signal Bank is currently represented as
  `workshopId: null` and `isGlobal: true`.
- Signal categories follow PESTEL:
  `POLITICAL`, `ECONOMIC`, `SOCIAL`, `TECHNOLOGICAL`, `ENVIRONMENTAL`, `LEGAL`.
- Time horizons are stored as `H1`, `H2`, and `H3`.
- Impact levels are `GLOBAL`, `REGION`, and `COUNTRY`.
- Workshop flows connect signals, scenarios, selected scenario state, and SWOT
  analysis. Be careful when changing relation behavior or deletion logic.

## File Placement

- Temporary manual scripts belong in `backend/scripts/`.
- Sample request/response JSON belongs in `backend/scratch/`.
- Backend automated tests belong in `backend/src/app/**/*.spec.ts`,
  `backend/src/modules/**/*.spec.ts`, or `backend/test/` for e2e tests.
- Frontend assets belong in `frontend/src/assets/` or `frontend/public/`
  depending on whether they are imported by code or served statically.

## Security And Secrets

- Never commit `backend/.env`.
- `AUTH_SECRET` must be a long random secret outside local development.
- Do not log JWTs, passwords, password hashes, or full auth payloads.
- Keep CORS local-development oriented unless a deployment task provides the
  target origins.

## Before Finishing

- Run the narrowest relevant verification commands for the files changed.
- Mention any command that could not be run and why.
- Summarize changed files and any database/setup steps the user must run.
- For any task that writes or edits code, include a recommended git commit name
  in the final response. Prefer Conventional Commit style, for example:
  `fix(signals): preserve vote averages after update`,
  `feat(auth): add admin role guard`, or
  `chore(frontend): tidy workshop route styles`.
- If multiple areas changed, choose the commit scope that best represents the
  primary behavior changed, such as `backend`, `frontend`, `signals`,
  `workshops`, `auth`, `swot`, or `admin`.
