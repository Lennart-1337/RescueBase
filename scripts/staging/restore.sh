#!/usr/bin/env sh
set -eu

PROJECT_DIR="${PROJECT_DIR:-/opt/rescuebase/staging}"
ENV_FILE="${ENV_FILE:-.env.staging}"
BACKUP_FILE="${BACKUP_FILE:?BACKUP_FILE is required}"
COMPOSE_ARGS="-f docker-compose.yml -f docker-compose.staging.yml"

case "$BACKUP_FILE" in
  /backups/*) TARGET_FILE="$BACKUP_FILE" ;;
  *) TARGET_FILE="/backups/$BACKUP_FILE" ;;
esac

cd "$PROJECT_DIR"
docker compose --env-file "$ENV_FILE" $COMPOSE_ARGS up -d mariadb
docker compose --profile ops --env-file "$ENV_FILE" $COMPOSE_ARGS run --rm -e BACKUP_FILE="$TARGET_FILE" restore
