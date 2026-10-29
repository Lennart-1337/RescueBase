# RescueBase

## Web Push

Generate a VAPID key pair with `npm run push:keys` and set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT` in the staging or production environment. Until all three values are set, the Push toggle remains disabled. On iPhone and iPad, RescueBase must be added to the Home Screen before notifications can be enabled.

RescueBase is a web-based MVP for managing Sanitätslager, Sanitätsrucksäcke, chargenbasierte Bestände, Ablaufdaten and public QR/NFC backpack checks.

## Stack

- npm workspaces with `apps/api`, `apps/web` and `packages/domain`
- NestJS API with OpenAPI, Prisma schema and MariaDB 11.4 target
- React + Vite SPA with Tailwind-compatible CSS and shadcn-style primitives
- npm-driven local development and GHCR-backed server deployment with Caddy reverse proxy
- Jest domain/API tests, Vitest frontend tests and Playwright-ready structure

## Local Development

```bash
npm_config_cache=.npm-cache npm install
npm run prisma:generate
npm run generate:api-client
npm run test
npm run build
npm run dev:stack
```

`npm run dev:stack` is the supported local entrypoint. It starts MariaDB, runs `prisma migrate deploy`, then launches the API and SPA dev servers. The API starts on `http://localhost:3000`. The SPA starts on `http://localhost:5173`.

If you only need one process after the stack is prepared, use the npm entrypoints instead of ad hoc shell commands:

- `npm run dev:db`
- `npm run dev:api`
- `npm run dev:web`
- `npm run prisma:seed`

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

- push a release candidate to `staging`
- let CI pass and `Publish Staging Images` publish its immutable image tag
- test that exact image in staging
- manually run `Promote Staging Images to Production` with that staging tag
- deploy on the server by pulling GHCR images, never by building them locally

The production environment file must set at least:

- `APP_DOMAIN`
- `APP_PUBLIC_URL`
- `JWT_SECRET`
- `BETTER_AUTH_SECRET` (mindestens 32 zufällige Zeichen)
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
- Set `IMAGE_TAG` to the immutable `prod-...` tag printed by the promotion workflow.

The production compose overlay keeps MariaDB internal-only, uses the GHCR images for `api` and `web`, and mounts a Cloudflare Origin Certificate into Caddy for `Full (strict)`.

### Production deploy

On the server:

```bash
export GHCR_USERNAME="<ghcr-user>"
export GHCR_TOKEN="<ghcr-read-token>"
sh scripts/production/deploy.sh
```

Deploy the immutable production tag printed by the promotion workflow:

```bash
IMAGE_TAG_OVERRIDE=prod-202606160945-abcd123 sh scripts/production/deploy.sh
```

The deploy script updates the `main` checkout, logs into GHCR, pulls the production images referenced by `.env.production`, starts the stack with `--no-build`, and prints the effective `IMAGE_TAG`. Use an immutable `prod-...` tag for normal deployments; `production-latest` is only a convenience tag.

## Staging with GHCR

Use `.env.staging.example` as the baseline for staging. The recommended staging flow is:

- push to `staging`
- let CI pass
- let `Publish Staging Images` push Linux `amd64` images to private GHCR
- deploy on the server by pulling GHCR images, never by building them locally

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

After placing the certificate and key, rerun the staging deploy script so the GHCR-backed stack is recreated without enabling host-side builds:

```bash
export GHCR_USERNAME="<ghcr-user>"
export GHCR_TOKEN="<ghcr-read-token>"
sh scripts/staging/deploy.sh
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

Each staging image includes an SBOM and maximum-mode BuildKit provenance. To release it, manually run `Promote Staging Images to Production` and pass the immutable `staging-<UTCYYYYMMDDHHmm>-<shortsha>` tag. The action retags the existing image manifests as `prod-...` without rebuilding them.

## Dienstplanung

Der Bereich **Dienste** integriert Sanitätsdienste von der Anfrage bis zur Nachbereitung. Admins besitzen Zugriff;
weitere Benutzer benötigen das Recht **Dienste verwalten** unter Benutzerverwaltung → Zugang. Dieses Recht umfasst
auch Personalstammdaten, geschützte Einsatzunterlagen und Finanzdaten. Helfer benötigen keinen Benutzerzugang.

Maurer und Köln liefern versionierte Planungsvorschläge mit Quellen und Rechenweg. Örtliche Anforderungen und der
eigene Kräfteansatz werden separat dokumentiert. Unterbesetzung, ungültige Qualifikationen und Doppelbelegungen
bleiben Warnungen; eine Freigabe mit offenen Warnungen benötigt eine Begründung. Relevante Planungsänderungen
heben die Freigabe auf. Abgeschlossene oder abgesagte Dienste müssen vor einer Änderung begründet geöffnet werden.

`SERVICE_DOCUMENT_DIR` bestimmt den privaten Speicherort der Einsatzunterlagen (lokal standardmäßig
`./var/service-documents`, im Compose-Stack `/app/var/service-documents`). Der neue Docker-Volume `service-documents`
muss zusammen mit der Datenbank gesichert werden. Die vorhandenen Backup-/Restore-Operationen speichern nun
Datenbank, MPG-Nachweise und Dienstunterlagen gemeinsam als `rescuebase-<Zeitpunkt>.tar.gz`, optional `.age`-verschlüsselt.
Die Restore-Operation unterstützt weiterhin ältere `.sql.gz`-Sicherungen; diese enthalten ausschließlich die Datenbank.
Während Sicherung und Wiederherstellung muss die API wie in den vorhandenen Wrapper-Skripten gestoppt sein.

Unter **Dienste → Dienst → Kalkulation → Dokumente** lassen sich Angebote und Rechnungen als PDF erstellen.
Nummer, Dokumentdatum und Empfängeranschrift werden eingegeben; Nummern sind je Dokumentart eindeutig.
Die Vorlagen verwenden den DLRG-Briefkopf mit Döpperstraße 47. Angebote gelten 30 Kalendertage ab Angebotsdatum.
Angebote rechnen mit Plan-Zeiten, Rechnungen mit vollständig erfassten Ist-Zeiten; angefangene Stunden,
Materialpauschale, Materialrabatt und freie Posten folgen der bestehenden Kalkulation. Altdienste verwenden ihre
gespeicherten Mengen und Tarife. Rechnungen sind auch bei abgeschlossenen Diensten möglich; abgesagte Dienste sind gesperrt.
PDF und unveränderlicher Berechnungsstand werden gemeinsam archiviert. Der erneute Download erfolgt unter
**Vorbereitung → Dokumente**. Versand- und Zahlungsstatus werden weiterhin separat gepflegt.
Kalkulationen verwenden EUR und kaufmännische Rundung je Position; es erfolgen keine Steuerberechnung oder Lagerbuchungen.
