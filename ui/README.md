# Threadline PLM

Threadline is a role-aware fashion product lifecycle workspace built with Next.js
and Neon Postgres. It covers seasons, styles, colourways, BOMs, specification and
quality data, supplier requests and quotes, sampling, purchase orders,
inspections, approvals, and audit history.

The frontend is being rebuilt in three controlled phases so working business
logic remains available throughout the migration.

## Frontend rebuild

| Phase | Focus                                                                               | Status      |
| ----- | ----------------------------------------------------------------------------------- | ----------- |
| 1     | Design system, role access, shared application shell, and role command centres      | Implemented |
| 2     | Operational lists: seasons, styles, colourways, BOMs, sourcing, and purchase orders | Planned     |
| 3     | Record detail workflows, admin, accessibility, performance, and legacy removal      | Planned     |

The full roadmap, boundaries, and acceptance criteria live in
[docs/frontend-rebuild/README.md](docs/frontend-rebuild/README.md).

## Run locally

1. Copy `.env.example` to `.env` and supply `DATABASE_URL` and `AUTH_SECRET`.
2. Install dependencies with `npm install`.
3. Prepare the database with `npm run db:reset`.
4. Start the app with `npm run dev`.

Useful checks:

```bash
npm run lint
npm run build
```

## Architecture

- `app/` — pages, client workspaces, route handlers, and the Phase 1 shell
- `app/components/` — shared frontend foundation introduced in Phase 1
- `app/Dashboard.tsx` — legacy automation/manual workflow, retained at each
  role’s `/workflow` route until Phase 3
- `lib/` — server-only query, authentication, parsing, and validation modules
- `db/schema.sql` — idempotent Postgres schema
- `docs/frontend-rebuild/` — frontend migration plan and phase specifications

Database credentials are used only in server-only modules. Role sessions are
signed and stored in an HTTP-only cookie.
