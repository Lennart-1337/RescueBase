#!/usr/bin/env sh
set -eu

PROJECT_DIR="${PROJECT_DIR:-/opt/rescuebase/staging}"
ENV_FILE="${ENV_FILE:-.env.staging}"
BRANCH="${BRANCH:-staging}"
GHCR_USERNAME="${GHCR_USERNAME:?GHCR_USERNAME is required}"
GHCR_TOKEN="${GHCR_TOKEN:?GHCR_TOKEN is required}"
IMAGE_TAG_OVERRIDE="${IMAGE_TAG_OVERRIDE:-}"
COMPOSE_ARGS="-f docker-compose.yml -f docker-compose.staging.yml"

cd "$PROJECT_DIR"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing environment file: $PROJECT_DIR/$ENV_FILE" >&2
  exit 1
fi

git fetch --all --prune
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

if [ -n "$IMAGE_TAG_OVERRIDE" ]; then
  if grep -q '^IMAGE_TAG=' "$ENV_FILE"; then
    sed -i "s|^IMAGE_TAG=.*|IMAGE_TAG=$IMAGE_TAG_OVERRIDE|" "$ENV_FILE"
  else
    printf '\nIMAGE_TAG=%s\n' "$IMAGE_TAG_OVERRIDE" >> "$ENV_FILE"
  fi
fi

printf '%s' "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USERNAME" --password-stdin
docker compose --env-file "$ENV_FILE" $COMPOSE_ARGS pull
docker compose --env-file "$ENV_FILE" $COMPOSE_ARGS up -d --no-build --remove-orphans
docker compose --env-file "$ENV_FILE" $COMPOSE_ARGS ps
echo "Deployed IMAGE_TAG=$(grep '^IMAGE_TAG=' "$ENV_FILE" | cut -d= -f2-)"
