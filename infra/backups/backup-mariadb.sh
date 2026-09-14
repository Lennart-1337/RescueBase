#!/usr/bin/env sh
set -eu

BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
DATABASE_URL="${DATABASE_URL:?DATABASE_URL is required}"
AGE_RECIPIENT="${BACKUP_AGE_RECIPIENT:-}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="$BACKUP_DIR/rescuebase-$STAMP.tar.gz"
DOCUMENT_DIR="${MPG_DOCUMENT_DIR:-/app/var/mpg-documents}"
WORK_DIR="$(mktemp -d)"
DB_CONFIG="$WORK_DIR/database.cnf"
trap 'rm -rf "$WORK_DIR"' EXIT

mkdir -p "$BACKUP_DIR"

echo "Creating RescueBase backup at $OUT"
node /app/infra/backups/write-db-config.mjs "$DB_CONFIG"
mariadb-dump --defaults-extra-file="$DB_CONFIG" --single-transaction --quick --skip-lock-tables > "$WORK_DIR/database.sql"
mkdir -p "$WORK_DIR/documents"
if [ -d "$DOCUMENT_DIR" ]; then cp -a "$DOCUMENT_DIR/." "$WORK_DIR/documents/"; fi
(cd "$WORK_DIR" && find database.sql documents -type f -exec sha256sum '{}' \; | LC_ALL=C sort > manifest.sha256)
(cd "$WORK_DIR" && tar -czf "$OUT" database.sql documents manifest.sha256)

if [ -n "$AGE_RECIPIENT" ] && ! command -v age >/dev/null 2>&1; then
  echo "age is required when BACKUP_AGE_RECIPIENT is set." >&2
  exit 1
fi

if [ -n "$AGE_RECIPIENT" ]; then
  age -r "$AGE_RECIPIENT" -o "$OUT.age" "$OUT"
  rm "$OUT"
  OUT="$OUT.age"
fi

find "$BACKUP_DIR" -type f \( -name "rescuebase-*.sql.gz*" -o -name "rescuebase-*.tar.gz*" \) -mtime +"$RETENTION_DAYS" -delete
echo "Backup completed: $OUT"
