# FieldPoint

Site and asset map for field-operations teams: offices, warehouses, client locations, job sites and vehicles on one map, with role-based access, an audit trail and CSV export.

Built to be boring and dependable: Node.js + Express 5, SQLite through the Node built-in `node:sqlite` (no native modules to compile), Leaflet with OpenStreetMap tiles (no map API key), and a dependency-free auth stack (scrypt hashes, server-side sessions, HMAC-signed cookies).

## Features

- **Map** — Leaflet + OpenStreetMap, colour-coded pins by category, dimmed pins for inactive sites, fit-to-data on load, right-click to add a site at a point.
- **Sites** — create / edit / delete, search across name, address and notes, filter by category and status, pagination, CSV export (formula-injection safe).
- **Geocoding** — "Locate" button resolves an address via OpenStreetMap Nominatim (browser-side, optional).
- **Auth** — first registered user becomes admin; admins create further accounts. scrypt password hashing, server-side sessions with signed cookies, rate-limited login, password change with session rotation.
- **Roles** — `admin` (everything) and `member` (view, create, edit sites). Last active admin cannot be demoted or disabled.
- **Audit log** — every login, user change and site mutation is recorded and visible to admins.
- **Hardening** — Helmet CSP, same-origin check on all mutations (CSRF), zod validation on every input, JSON body limit, global + login rate limits, JSON 404/500 envelopes that never leak stack traces.

## Quick start

Requires Node.js 22.13+ (uses `node:sqlite`).

```bash
npm install
npm run seed      # optional demo data: admin@fieldpoint.local / admin-demo-pass
npm start         # http://localhost:4100 (also printed with your LAN address)
```

Without seeding, open the app and create the first administrator account from the sign-in screen.

Demo accounts created by `npm run seed`:

| Email | Password | Role |
| --- | --- | --- |
| admin@fieldpoint.local | admin-demo-pass | admin |
| ops@fieldpoint.local | ops-demo-pass1 | member |

## Configuration

Copy `.env.example` to `.env` (or export variables). All optional in development.

| Variable | Default | Notes |
| --- | --- | --- |
| `PORT` | `4100` | HTTP port |
| `HOST` | `0.0.0.0` | Bind address; use `127.0.0.1` to keep it local |
| `DB_PATH` | `./data/fieldpoint.db` | SQLite file, directory auto-created |
| `SESSION_SECRET` | auto-generated into `data/.session-secret` (dev) | **Required in production**, 32+ chars |
| `SESSION_TTL_HOURS` | `72` | Session lifetime |
| `NODE_ENV` | `development` | `production` enables secure cookies + trust-proxy |
| `ALLOWED_ORIGINS` | same-origin only | Comma-separated extra origins allowed to mutate |

The app does not read `.env` itself; use `node --env-file=.env src/server.js` or your process manager.

## API

All routes return `{ ok: boolean, ... }`. Errors: `{ ok: false, error, details? }`.

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/health` | – | Liveness |
| GET | `/api/auth/me` | – | Current user + `needsBootstrap` |
| POST | `/api/auth/register` | none (first user) / admin | Create user |
| POST | `/api/auth/login` | – | Sign in (sets `fp_session` cookie) |
| POST | `/api/auth/logout` | – | Destroy session |
| POST | `/api/auth/password` | user | Change own password |
| GET | `/api/sites` | user | List; `q`, `category`, `status`, `limit`, `offset` |
| GET | `/api/sites/stats` | user | Counts by category × status |
| GET | `/api/sites/export.csv` | user | CSV export (same filters) |
| GET/POST | `/api/sites`, `/api/sites/:id` | user | Read / create |
| PUT | `/api/sites/:id` | user | Partial update |
| DELETE | `/api/sites/:id` | admin | Delete |
| GET | `/api/users` | admin | List users |
| PATCH | `/api/users/:id` | admin | Change `role` / `isActive` |
| GET | `/api/users/audit` | admin | Recent audit entries |

Site categories: `office`, `warehouse`, `client`, `job_site`, `vehicle`, `other`. Statuses: `active`, `planned`, `inactive`.

## Development

```bash
npm run dev             # restart on change
npm test                # node:test + supertest, in-memory SQLite
npm run test:coverage   # with V8 coverage report
npm run lint            # syntax check + forbidden-statement scan
```

## Docker

```bash
docker build -t fieldpoint .
docker run -p 4100:4100 -v fieldpoint-data:/data -e SESSION_SECRET=$(openssl rand -hex 32) fieldpoint
```

## Project layout

```
src/
  app.js            express app factory (used by server and tests)
  server.js         entrypoint: listen, LAN address banner, graceful shutdown
  config.js         env → frozen config
  db/               schema + sqlite connection
  auth/             password hashing, session store, middleware, routes
  sites/            zod schemas, repository, routes, csv
  users/            repository + admin routes
  audit/            append-only audit log
  middleware/       errors, validation, origin check
public/             static SPA (vanilla ES modules + Leaflet)
scripts/            seed, lint
test/               integration + unit tests
```

## Limitations / next steps

- Single-process SQLite: fine for a team; move to Postgres behind the repository layer for multi-instance deployments.
- No email flow: admins set temporary passwords and users change them in-app.
- Tiles and geocoding call OpenStreetMap's public services; for heavy use, point `TILE_URL` in `public/js/map.js` at your own tile provider.
