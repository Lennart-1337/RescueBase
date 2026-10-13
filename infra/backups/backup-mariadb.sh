#!/usr/bin/env sh
set -eu

BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
DATABASE_URL="${DATABASE_URL:?DATABASE_URL is required}"
AGE_RECIPIENT="${BACKUP_AGE_RECIPIENT:-}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="$BACKUP_DIR/rescuebase-$STAMP.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "Creating MariaDB backup at $OUT"
mariadb-dump --single-transaction --quick --skip-lock-tables "$DATABASE_URL" | gzip > "$OUT"

if [ -n "$AGE_RECIPIENT" ] && ! command -v age >/dev/null 2>&1; then
  echo "age is required when BACKUP_AGE_RECIPIENT is set." >&2
  exit 1
fi

if [ -n "$AGE_RECIPIENT" ]; then
  age -r "$AGE_RECIPIENT" -o "$OUT.age" "$OUT"
  rm "$OUT"
  OUT="$OUT.age"
fi

find "$BACKUP_DIR" -type f -name "rescuebase-*.sql.gz*" -mtime +"$RETENTION_DAYS" -delete
echo "Backup completed: $OUT"
