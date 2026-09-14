#!/usr/bin/env sh
set -eu

PROJECT_DIR="${PROJECT_DIR:-/opt/rescuebase/staging}"
ENV_FILE="${ENV_FILE:-.env.staging}"
COMPOSE_ARGS="-f docker-compose.yml -f docker-compose.staging.yml"

cd "$PROJECT_DIR"
docker compose --env-file "$ENV_FILE" $COMPOSE_ARGS up -d mariadb
docker compose --env-file "$ENV_FILE" $COMPOSE_ARGS stop api
trap 'docker compose --env-file "$ENV_FILE" $COMPOSE_ARGS start api' EXIT
docker compose --profile ops --env-file "$ENV_FILE" $COMPOSE_ARGS run --rm backup
