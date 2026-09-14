#!/usr/bin/env sh
set -eu

DATABASE_URL="${DATABASE_URL:?DATABASE_URL is required}"
BACKUP_FILE="${BACKUP_FILE:?BACKUP_FILE is required}"
AGE_IDENTITY_FILE="${AGE_IDENTITY_FILE:-}"
DOCUMENT_DIR="${MPG_DOCUMENT_DIR:-/app/var/mpg-documents}"
WORK_DIR="$(mktemp -d)"
DB_CONFIG="$WORK_DIR/database.cnf"
ARCHIVE="$BACKUP_FILE"
trap 'rm -rf "$WORK_DIR"' EXIT

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Backup file not found: $BACKUP_FILE" >&2
  exit 1
fi

restore_plain() {
  node /app/infra/backups/write-db-config.mjs "$DB_CONFIG"
  gzip -dc "$1" | mariadb --defaults-extra-file="$DB_CONFIG"
}

restore_encrypted() {
  if [ -z "$AGE_IDENTITY_FILE" ]; then
    echo "AGE_IDENTITY_FILE is required for encrypted restore." >&2
    exit 1
  fi
  if [ ! -f "$AGE_IDENTITY_FILE" ]; then
    echo "Age identity file not found: $AGE_IDENTITY_FILE" >&2
    exit 1
  fi
  node /app/infra/backups/write-db-config.mjs "$DB_CONFIG"
  age -d -i "$AGE_IDENTITY_FILE" "$1" | gzip -dc | mariadb --defaults-extra-file="$DB_CONFIG"
}

restore_archive() {
  case "$1" in *.age) ARCHIVE="$WORK_DIR/backup.tar.gz"; age -d -i "$AGE_IDENTITY_FILE" -o "$ARCHIVE" "$1" ;; esac
  tar -tzf "$ARCHIVE" | while IFS= read -r entry; do case "$entry" in database.sql|manifest.sha256|documents|documents/*) ;; *) echo "Unsafe backup entry: $entry" >&2; exit 1 ;; esac; done
  tar -xzf "$ARCHIVE" -C "$WORK_DIR"
  (cd "$WORK_DIR" && sha256sum -c manifest.sha256)
  node /app/infra/backups/write-db-config.mjs "$DB_CONFIG"
  mariadb --defaults-extra-file="$DB_CONFIG" < "$WORK_DIR/database.sql"
  mkdir -p "$DOCUMENT_DIR"
  find "$DOCUMENT_DIR" -mindepth 1 -maxdepth 1 -exec rm -rf '{}' +
  cp -a "$WORK_DIR/documents/." "$DOCUMENT_DIR/"
}

case "$BACKUP_FILE" in
  *.sql.gz.age) restore_encrypted "$BACKUP_FILE" ;;
  *.sql.gz) restore_plain "$BACKUP_FILE" ;;
  *.tar.gz|*.tar.gz.age) restore_archive "$BACKUP_FILE" ;;
  *)
    echo "Unsupported backup format: $BACKUP_FILE" >&2
    exit 1
    ;;
esac

echo "Restore completed from $BACKUP_FILE"
