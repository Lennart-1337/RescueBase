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

## Production on Linux with GHCR

Use `.env.production.example` as the baseline for production. The recommended production flow is:

- push to `main`
- let CI pass
- let `Publish Production Images` push Linux `amd64` images to private GHCR
- let the server pull images from GHCR instead of building them locally

The production environment file must set at least:

- `APP_DOMAIN`
- `APP_PUBLIC_URL`
- `JWT_SECRET`
- `MARIADB_DATABASE`
- `MARIADB_USER`
- `MARIADB_PASSWORD`
- `MARIADB_ROOT_PASSWORD`
- `RESEND_API_KEY`
- `RESEND_FROM`
- `API_IMAGE`
- `WEB_IMAGE`
- `IMAGE_TAG`
- `CLOUDFLARE_ORIGIN_CERT_HOST_FILE`
- `CLOUDFLARE_ORIGIN_KEY_HOST_FILE`

Recommended image values:

- `API_IMAGE=ghcr.io/<owner>/rescuebase-api`
- `WEB_IMAGE=ghcr.io/<owner>/rescuebase-web`
- `IMAGE_TAG=production-latest`

The production compose overlay keeps MariaDB internal-only, uses the GHCR images for `api` and `web`, and mounts a Cloudflare Origin Certificate into Caddy for `Full (strict)`.

### Production deploy

On the server:

```bash
export GHCR_USERNAME="<ghcr-user>"
export GHCR_TOKEN="<ghcr-read-token>"
sh scripts/production/deploy.sh
```

Rollback or promotion to a pinned image tag:

```bash
IMAGE_TAG_OVERRIDE=prod-202606160945-abcd123 sh scripts/production/deploy.sh
```

The deploy script updates the `main` checkout, logs into GHCR, pulls the production images referenced by `.env.production`, starts the stack with `--no-build`, and prints the effective `IMAGE_TAG`.

## Staging with GHCR

Use `.env.staging.example` as the baseline for staging. The recommended staging flow is:

- push to `staging`
- let CI pass
- let `Publish Staging Images` push Linux `amd64` images to private GHCR
- let the server pull images from GHCR instead of building them locally

Required staging assets:

- a Linux host with Docker Engine and Docker Compose
- a public DNS record for the staging domain
- a repository checkout at `/opt/rescuebase/staging` or a matching `PROJECT_DIR`
- a `.env.staging` file based on `.env.staging.example`
- a Cloudflare Origin Certificate and matching private key on the server filesystem
- `GHCR_USERNAME` and `GHCR_TOKEN` available in the deploy shell
- an age identity file matching `AGE_IDENTITY_HOST_FILE` when restore decryption is enabled

### Staging deploy

Standard deploy from the `staging` branch:

```bash
export GHCR_USERNAME="<ghcr-user>"
export GHCR_TOKEN="<ghcr-read-token>"
sh scripts/staging/deploy.sh
```

Rollback or promotion to a pinned immutable image tag:

```bash
IMAGE_TAG_OVERRIDE=staging-202606141030-abcd123 sh scripts/staging/deploy.sh
```

The deploy script updates the checkout, logs into GHCR, pulls the images referenced by `.env.staging`, starts the stack with `--no-build`, and prints the effective `IMAGE_TAG`.

### Cloudflare Full (strict)

RescueBase staging is designed to sit behind Cloudflare with SSL mode `Full (strict)`. Use a proxied DNS record for your staging hostname and install a Cloudflare Origin Certificate plus private key on the server. The staging Caddy service mounts those files and terminates HTTPS directly on the origin.

After placing the certificate and key, recreate Caddy:

```bash
docker compose --env-file .env.staging -f docker-compose.yml -f docker-compose.staging.yml up -d --force-recreate caddy
```

### Backups and Restore

Run a manual encrypted backup:

```bash
sh scripts/staging/backup.sh
```

Restore from a backup file already present in the checkout-local `backups/` directory:

```bash
BACKUP_FILE=rescuebase-20260614T020000Z.sql.gz.age sh scripts/staging/restore.sh
```

The backup container writes compressed SQL dumps under `backups/` in the repository checkout and encrypts them to `.age` when `BACKUP_AGE_RECIPIENT` is configured. Restore accepts either `.sql.gz` or `.sql.gz.age`.

If `BACKUP_AGE_RECIPIENT` is empty, backup output stays as plain `.sql.gz` and no age key is required for deploy.

### GHCR staging publish

Pushes to the `staging` branch run CI first. When CI succeeds, the `Publish Staging Images` workflow publishes Linux `amd64` images to private GHCR:

- `ghcr.io/<owner>/rescuebase-api:staging-<UTCYYYYMMDDHHmm>-<shortsha>`
- `ghcr.io/<owner>/rescuebase-api:staging-latest`
- `ghcr.io/<owner>/rescuebase-web:staging-<UTCYYYYMMDDHHmm>-<shortsha>`
- `ghcr.io/<owner>/rescuebase-web:staging-latest`
