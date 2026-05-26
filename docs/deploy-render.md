# Deploying Blue Horizon on Render

This repo includes a `render.yaml` Blueprint for a quick full-stack Render deploy:

- `blue-horizon-db`: PostgreSQL 16
- `blue-horizon-api`: NestJS API
- `blue-horizon-web`: Vite static frontend

## 1. Push the repo

Commit and push this repository to GitHub or GitLab. Render Blueprints deploy from a Git provider.

## 2. Create the Blueprint

In Render, create a new Blueprint and point it at this repository. Render reads `render.yaml` from the repository root and creates the database, API service, and static frontend.

If you want AI scenario generation, add `DOTBLUE_API_KEY` to the
`blue-horizon-api` service environment after the first deploy. The rest of the
app can run without it.

## 3. Wait for deploys

The backend build runs:

```sh
npm ci && npx prisma generate && npm run build
```

The backend start command runs:

```sh
npm run deploy:start
```

That applies the Prisma schema with `prisma db push` before starting the API. This is convenient for a demo deploy. For a production deployment, prefer proper Prisma migrations.

## 4. Optional seed data

After the first backend deploy is healthy, you can run the seed command from a
Render shell or one-off job for `blue-horizon-api`:

```sh
npx prisma db seed
```

The seed creates an admin user:

- Email: `admin@bluehorizon.com`
- Password: `admin123`

The seed also clears and recreates sample data, so run it only for a disposable
demo database. Do not keep that password for a real deployment.

## 5. Environment notes

The frontend reads `VITE_API_ORIGIN` at build time. In `render.yaml`, it is wired to the API service's `RENDER_EXTERNAL_URL`.

When running on Render, the backend allows `https://*.onrender.com` origins for
quick demo deploys. For a custom frontend domain, add that exact origin to
`CORS_ORIGINS` on the `blue-horizon-api` service.
