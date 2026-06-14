# RescueBase

RescueBase is a web-based MVP for managing Sanitätslager, Sanitätsrucksäcke, chargenbasierte Bestände, Ablaufdaten and public QR/NFC backpack checks.

## Stack

- npm workspaces with `apps/api`, `apps/web` and `packages/domain`
- NestJS API with OpenAPI, Prisma schema and MariaDB 11.4 target
- React + Vite SPA with Tailwind-compatible CSS and shadcn-style primitives
- Docker Compose deployment with Caddy reverse proxy
- Jest domain/API tests, Vitest frontend tests and Playwright-ready structure

## Local Development

```bash
npm_config_cache=.npm-cache npm install
npm run prisma:generate
docker compose up -d mariadb
npm run prisma:deploy
npm run build -w @rescuebase/api
npm run prisma:seed
npm run generate:api-client
npm run test
npm run build
npm run dev:api
npm run dev:web
```

The API starts on `http://localhost:3000`. The SPA starts on `http://localhost:5173`.

API runtime persistence uses MariaDB through Prisma. The development seed creates the reproducible QR/NFC check link
`/check/SAN-RS-001-ZUGANG-2026`; production deployments should omit `RESCUEBASE_SEED_DEV_DATA` and use the setup/admin
flows instead.

Development seed credentials are only created when seed data is explicitly loaded:

- `admin@rescuebase.local` / `rescuebase-admin`
- `lager@rescuebase.local` / `rescuebase-lager`

Override them with `RESCUEBASE_DEV_ADMIN_PASSWORD` and `RESCUEBASE_DEV_WAREHOUSE_PASSWORD` before seeding. Emergency admin
reset is available through `npm run admin:reset -- admin@example.org 'new-long-password'`; it updates the database, clears
active sessions, disables 2FA for that admin, and writes an audit event.

API integration tests use Testcontainers with MariaDB 11.4. When Docker is unavailable locally, those tests log a skip
warning; CI sets `REQUIRE_TESTCONTAINERS=true` so the database-backed tests must run.

## OpenAPI Contract

The canonical API contract lives in `apps/api/src/openapi/document.ts`. Generate the committed OpenAPI JSON and frontend
types without starting a local API server:

```bash
npm run generate:api-client
```

This writes `apps/api/openapi.json` and `apps/web/src/lib/generated-api.d.ts`. The web API wrapper imports those generated
types, so path, request-body and response drift is caught by TypeScript. CI runs the generator before linting and tests.

## MVP Workflows

- Admins manage articles, storage locations, kit templates, kits and QR/NFC links.
- Admins invite users by E-Mail link; invited users activate their account by setting their own password.
- Users can reset passwords by E-Mail link and can enroll either TOTP or E-Mail-Code 2FA.
- Public checkers open a secret kit link, count quantities with plus/minus controls, document expired discarded material, sign and submit.
- RescueBase creates replenishment orders from shortages and discarded expired material.
- Lagerwarte fulfill replenishment orders partially or fully. Only warehouse actions change stock.
- Audit events record relevant domain changes.

## Production Notes

Use `.env.example` as the baseline. Production deployments should set a strong `JWT_SECRET`, switch `MAIL_PROVIDER=smtp`, configure the `SMTP_*` variables, and enable encrypted backups.
