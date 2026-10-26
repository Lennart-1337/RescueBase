#!/usr/bin/env sh
set -eu
umask 077

DATABASE_URL="${DATABASE_URL:?DATABASE_URL is required}"
BACKUP_FILE="${BACKUP_FILE:?BACKUP_FILE is required}"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT HUP INT TERM
if [ ! -f "$BACKUP_FILE" ]; then
  echo "Backup file not found: $BACKUP_FILE" >&2
  exit 1
fi
SOURCE="$BACKUP_FILE"
case "$BACKUP_FILE" in
  *.age)
    AGE_IDENTITY_FILE="${AGE_IDENTITY_FILE:?AGE_IDENTITY_FILE is required for encrypted restore}"
    age -d -i "$AGE_IDENTITY_FILE" -o "$WORK/decrypted" "$BACKUP_FILE"
    SOURCE="$WORK/decrypted"
    ;;
esac
case "$BACKUP_FILE" in
  *.tar.gz|*.tar.gz.age)
    tar -tzf "$SOURCE" > "$WORK/entries"
    while IFS= read -r entry; do
      case "$entry" in
        /*|*../*|../*|*/..) echo "Unsafe backup path" >&2; exit 1 ;;
        database.sql.gz|mpg-documents|mpg-documents/|mpg-documents/*|service-documents|service-documents/|service-documents/*) ;;
        *) echo "Unexpected backup entry: $entry" >&2; exit 1 ;;
      esac
    done < "$WORK/entries"
    tar -tvzf "$SOURCE" > "$WORK/types"
    if ! awk '$1 !~ /^[-d]/ { exit 1 }' "$WORK/types"; then
      echo "Links and special files are not supported in backups." >&2
      exit 1
    fi
    mkdir "$WORK/extracted"
    tar -xzf "$SOURCE" -C "$WORK/extracted"
    gzip -dc "$WORK/extracted/database.sql.gz" > "$WORK/database.sql"
    # Documents are restored before the database references become visible.
    for kind in mpg service; do
      case "$kind" in
        mpg) TARGET="${MPG_DOCUMENT_DIR:-/documents/mpg}" ;;
        service) TARGET="${SERVICE_DOCUMENT_DIR:-/documents/services}" ;;
      esac
      mkdir -p "$TARGET"
      cp -a "$WORK/extracted/$kind-documents/." "$TARGET/"
    done
    ;;
  *.sql.gz|*.sql.gz.age) gzip -dc "$SOURCE" > "$WORK/database.sql" ;;
  *) echo "Unsupported backup format: $BACKUP_FILE" >&2; exit 1 ;;
esac
mariadb "$DATABASE_URL" < "$WORK/database.sql"
echo "Restore completed from $BACKUP_FILE"
