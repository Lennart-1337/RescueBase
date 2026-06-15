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

## Staging on Windows Server 2025

RescueBase staging can run directly from a Windows checkout with Docker Desktop in Linux-container mode. The Windows host runs Docker Desktop, keeps the repository checkout locally, and starts the published GHCR images through Docker Compose.

### Required server assets

- A Windows Server 2025 host with Docker Desktop installed and running in Linux-container mode
- A public DNS record for the staging domain
- A private checkout of this repository on the Windows filesystem
- A `.env.staging` file based on `.env.staging.example`
- A Cloudflare Origin Certificate and matching private key on the Windows filesystem
- `GHCR_USERNAME` and `GHCR_TOKEN` available to the Windows operator shell
- An age identity file on the Windows filesystem matching `AGE_IDENTITY_HOST_FILE` for restore operations

### First bootstrap

From PowerShell in the repository checkout:

```powershell
.\scripts\windows-staging\bootstrap-docker-desktop-staging.ps1
```

Then edit `.env.staging`, set the real secrets, set `CLOUDFLARE_ORIGIN_CERT_HOST_FILE` and `CLOUDFLARE_ORIGIN_KEY_HOST_FILE` to the Windows paths of your Cloudflare Origin Certificate and key, set `AGE_IDENTITY_HOST_FILE` if you later enable encrypted restore, and keep `AGE_IDENTITY_FILE` as the container path `/run/secrets/staging.agekey`.

If you want backups disabled for now, leave `BACKUP_AGE_RECIPIENT=` empty and keep `AGE_IDENTITY_HOST_FILE=./keys/restore-disabled.txt`.

### Staging deploy and rollback

Standard deploy from the `staging` branch:

```powershell
$env:GHCR_USERNAME = "<ghcr-user>"
$env:GHCR_TOKEN = "<ghcr-read-token>"
.\scripts\windows-staging\deploy-staging.ps1
```

Rollback or promotion to a pinned immutable image tag:

```powershell
.\scripts\windows-staging\deploy-staging.ps1 -ImageTag staging-202606141030-abcd123
```

The deploy wrapper updates the Windows checkout, logs into GHCR, pulls the images referenced by `.env.staging`, starts the stack with `--no-build`, and prints the effective `IMAGE_TAG`.

### Cloudflare Full (strict)

RescueBase staging is designed to sit behind Cloudflare with SSL mode `Full (strict)`. Use a proxied DNS record for your staging hostname and install a Cloudflare Origin Certificate plus private key on the Windows host. The staging Caddy service mounts those files and terminates HTTPS directly on the origin.

Example values in `.env.staging`:

```env
APP_DOMAIN=rescuebasestaging.example.org
APP_PUBLIC_URL=https://rescuebasestaging.example.org
CLOUDFLARE_ORIGIN_CERT_HOST_FILE=C:/Users/Administrator/Desktop/RescueBase/infra/caddy/origin-cert.pem
CLOUDFLARE_ORIGIN_KEY_HOST_FILE=C:/Users/Administrator/Desktop/RescueBase/infra/caddy/origin-key.pem
```

After placing the certificate and key, recreate Caddy:

```powershell
docker compose --env-file .env.staging -f docker-compose.yml -f docker-compose.staging.yml up -d --force-recreate caddy
```

### Backups and restore

Run a manual encrypted backup:

```powershell
.\scripts\windows-staging\backup-staging.ps1
```

Restore from a backup file already present in the checkout-local `backups\` directory:

```powershell
.\scripts\windows-staging\restore-staging.ps1 -BackupFile rescuebase-20260614T020000Z.sql.gz.age
```

Nightly backups should be scheduled from Windows Task Scheduler with a PowerShell action such as:

```text
Program/script: powershell.exe
Arguments: -NoProfile -ExecutionPolicy Bypass -File C:\path\to\repo\scripts\windows-staging\backup-staging.ps1
```

The backup container writes compressed SQL dumps under `backups/` in the repository checkout and encrypts them to `.age` when `BACKUP_AGE_RECIPIENT` is configured. Restore accepts either `.sql.gz` or `.sql.gz.age`.

If `BACKUP_AGE_RECIPIENT` is empty, backup output stays as plain `.sql.gz` and no age key is required for deploy.

### GHCR staging publish

Pushes to the `staging` branch run CI first. When CI succeeds, the `Publish Staging Images` workflow publishes Linux `amd64` images to private GHCR:

- `ghcr.io/<owner>/rescuebase-api:staging-<UTCYYYYMMDDHHmm>-<shortsha>`
- `ghcr.io/<owner>/rescuebase-api:staging-latest`
- `ghcr.io/<owner>/rescuebase-web:staging-<UTCYYYYMMDDHHmm>-<shortsha>`
- `ghcr.io/<owner>/rescuebase-web:staging-latest`
