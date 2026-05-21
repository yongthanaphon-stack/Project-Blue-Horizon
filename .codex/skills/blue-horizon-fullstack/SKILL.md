---
name: blue-horizon-fullstack
description: Work effectively in the Blue Horizon full-stack repository. Use when Codex needs to implement, debug, review, or plan changes involving the NestJS API, Prisma/PostgreSQL schema, Vite React frontend, authentication, admin roles, signal bank, workshop, scenario generation, or SWOT workflows in this project.
---

# Blue Horizon Full-Stack

## Start Here

Read `AGENTS.md` first for repository-wide rules, commands, and conventions.
Then inspect the smallest relevant slice before editing:

- Backend feature: `backend/src/<feature>/`, related DTOs, and
  `backend/prisma/schema.prisma`.
- Frontend feature: route in `frontend/src/App.jsx`, page/component files, CSS,
  and API client methods in `frontend/src/services/api.js`.
- Auth/roles: `backend/src/auth/`, `frontend/src/store/slices/authSlice.js`,
  and `frontend/src/constants/roles.js`.
- Database behavior: Prisma schema, seed data, and the service method that owns
  the query or mutation.

Always check `git status --short` before changing files. Preserve user changes.

## Choose The Work Path

Use this decision flow:

- API behavior, validation, persistence, auth checks, or business rules:
  work in `backend/src/`.
- Schema fields, enums, relations, seed data, or DB adapters:
  work in `backend/prisma/` and verify Prisma client/database state.
- UI routes, forms, protected navigation, or display state:
  work in `frontend/src/`.
- Contract mismatch between UI and API:
  update the backend DTO/service/controller and the frontend API/client usage
  together.
- Visual polish:
  reuse `frontend/src/styles/global.css` tokens and page-local CSS patterns.

## Backend Workflow

Follow the local NestJS pattern:

1. Add or update DTO validation in `src/<feature>/dto/*.dto.ts`.
2. Keep controllers thin; parse params with `ParseIntPipe` and call services.
3. Put business rules in services and use `PrismaService` for DB access.
4. Return frontend-friendly shapes without leaking secrets or hashes.
5. Add focused tests when behavior changes are non-trivial.

Protect existing domain rules:

- Signal Bank global records use `workshopId: null` and `isGlobal: true`.
- Signals are soft-deleted with `deletedAt`.
- Signal mutations should keep history records when create/update/delete intent
  changes.
- Users cannot vote for their own signal.
- Vote upserts are unique by `(signalId, userId)` and update `impactScore` as an
  average.
- JWT auth must not regain demo-token shortcuts.
- Sanitize free-form signal text before persistence.

## Prisma And Database Workflow

When changing data shape:

1. Update `backend/prisma/schema.prisma`.
2. Update DTOs, services, seed data, and frontend assumptions in the same task.
3. Use `npx prisma generate` after schema changes.
4. Use `npx prisma db push` for local draft schema sync unless the user asks for
   migrations.
5. Avoid destructive reset/seed workflows unless the user explicitly approves.

Use PostgreSQL from `docker-compose.yml` for local checks. Environment variables
belong in `backend/.env`, never in committed files.

## Frontend Workflow

Follow the current React/Vite style:

1. Keep route ownership in `frontend/src/App.jsx`.
2. Add API methods to `frontend/src/services/api.js`; avoid raw axios calls in
   pages.
3. Store auth/session behavior in Redux auth slice and keep localStorage keys
   unchanged.
4. Use `isAdminRole` for admin-only UI and route decisions.
5. Use `lucide-react` icons and existing CSS variables.
6. Keep page-specific CSS beside the page when that pattern already exists.

When building UI, preserve the app-like operational feel: dense, readable,
responsive, and aligned with the sidebar/topbar/canvas layouts already present.

## Domain Checklist

Check these concepts whenever a change touches the foresight workflow:

- PESTEL categories:
  `POLITICAL`, `ECONOMIC`, `SOCIAL`, `TECHNOLOGICAL`, `ENVIRONMENTAL`, `LEGAL`.
- Time horizons: `H1`, `H2`, `H3`.
- Impact levels: `GLOBAL`, `REGION`, `COUNTRY`.
- Roles: `ANALYST`, `LEAD_ANALYST`, `ADMIN`, `ADMIN_SYSTEM`.
- Workshop flow: workshop -> environmental scan/signals -> scenarios ->
  selected scenario -> SWOT.

## Verification Matrix

Run the narrowest relevant checks:

- Backend TypeScript/API change: `cd backend && npm run build`.
- Backend unit behavior: `cd backend && npm test`.
- Backend e2e/database behavior: ensure PostgreSQL is running, then
  `cd backend && npm run test:e2e`.
- Prisma schema change: `cd backend && npx prisma generate`; run DB sync only
  when appropriate.
- Frontend JS/JSX/CSS change: `cd frontend && npm run lint && npm run build`.
- Cross-stack change: run backend build plus frontend build at minimum.

Mention any skipped verification and the reason.

## Finish Well

Before responding:

- Re-run `git status --short`.
- Summarize the changed files and behavior.
- Call out setup/database commands the user must run.
- Keep the final answer concise and specific to the completed task.
