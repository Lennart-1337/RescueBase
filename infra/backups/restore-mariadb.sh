#!/usr/bin/env sh
set -eu

DATABASE_URL="${DATABASE_URL:?DATABASE_URL is required}"
BACKUP_FILE="${BACKUP_FILE:?BACKUP_FILE is required}"
AGE_IDENTITY_FILE="${AGE_IDENTITY_FILE:-}"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Backup file not found: $BACKUP_FILE" >&2
  exit 1
fi

restore_plain() {
  gzip -dc "$1" | mariadb "$DATABASE_URL"
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
  age -d -i "$AGE_IDENTITY_FILE" "$1" | gzip -dc | mariadb "$DATABASE_URL"
}

case "$BACKUP_FILE" in
  *.sql.gz.age) restore_encrypted "$BACKUP_FILE" ;;
  *.sql.gz) restore_plain "$BACKUP_FILE" ;;
  *)
    echo "Unsupported backup format: $BACKUP_FILE" >&2
    exit 1
    ;;
esac

echo "Restore completed from $BACKUP_FILE"
