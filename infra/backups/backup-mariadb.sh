#!/usr/bin/env sh
set -eu
umask 077

BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
DATABASE_URL="${DATABASE_URL:?DATABASE_URL is required}"
AGE_RECIPIENT="${BACKUP_AGE_RECIPIENT:-}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="$BACKUP_DIR/rescuebase-$STAMP.tar.gz"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT HUP INT TERM
mkdir -p "$BACKUP_DIR" "$WORK/mpg-documents" "$WORK/service-documents"

if [ -n "$AGE_RECIPIENT" ] && ! command -v age >/dev/null 2>&1; then
  echo "age is required when BACKUP_AGE_RECIPIENT is set." >&2
  exit 1
fi

# Intermediate files make dump/compression failures observable without pipefail.
mariadb-dump --single-transaction --quick --skip-lock-tables "$DATABASE_URL" > "$WORK/database.sql"
gzip "$WORK/database.sql"
if [ -d "${MPG_DOCUMENT_DIR:-/documents/mpg}" ]; then
  cp -a "${MPG_DOCUMENT_DIR:-/documents/mpg}/." "$WORK/mpg-documents/"
fi
if [ -d "${SERVICE_DOCUMENT_DIR:-/documents/services}" ]; then
  cp -a "${SERVICE_DOCUMENT_DIR:-/documents/services}/." "$WORK/service-documents/"
fi
tar -czf "$WORK/backup.tar.gz" -C "$WORK" database.sql.gz mpg-documents service-documents
if [ -n "$AGE_RECIPIENT" ]; then
  age -r "$AGE_RECIPIENT" -o "$OUT.age" "$WORK/backup.tar.gz"
  OUT="$OUT.age"
else
  cp "$WORK/backup.tar.gz" "$OUT"
fi
find "$BACKUP_DIR" -type f \( -name 'rescuebase-*.tar.gz*' -o -name 'rescuebase-*.sql.gz*' \) -mtime +"$RETENTION_DAYS" -delete
echo "Database and documents backed up: $OUT"
