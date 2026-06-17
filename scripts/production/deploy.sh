#!/usr/bin/env sh
set -eu

fail() {
  printf '%s\n' "$1" >&2
  exit 1
}

read_env_value() {
  key="$1"
  awk -F= -v key="$1" '$1 == key { value = substr($0, length(key) + 2) } END { print value }' "$ENV_FILE"
}

require_env_value() {
  key="$1"
  value="$(read_env_value "$key")"
  [ -n "$value" ] || fail "Missing ${key} in $PROJECT_DIR/$ENV_FILE"
  printf '%s' "$value"
}

PROJECT_DIR="${PROJECT_DIR:-/opt/rescuebase/app}"
ENV_FILE="${ENV_FILE:-.env.production}"
BRANCH="${BRANCH:-main}"
GHCR_USERNAME="${GHCR_USERNAME:?GHCR_USERNAME is required}"
GHCR_TOKEN="${GHCR_TOKEN:?GHCR_TOKEN is required}"
IMAGE_TAG_OVERRIDE="${IMAGE_TAG_OVERRIDE:-}"
COMPOSE_ARGS="-f docker-compose.yml -f docker-compose.production.yml"

cd "$PROJECT_DIR"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing environment file: $PROJECT_DIR/$ENV_FILE" >&2
  exit 1
fi
if [ ! -d .git ]; then
  fail "Missing git checkout in $PROJECT_DIR"
fi

API_IMAGE="$(require_env_value API_IMAGE)"
WEB_IMAGE="$(require_env_value WEB_IMAGE)"
DEFAULT_IMAGE_TAG="$(require_env_value IMAGE_TAG)"
MARIADB_DATABASE="$(require_env_value MARIADB_DATABASE)"
MARIADB_USER="$(require_env_value MARIADB_USER)"
MARIADB_PASSWORD="$(require_env_value MARIADB_PASSWORD)"
APP_PUBLIC_URL="$(require_env_value APP_PUBLIC_URL)"
JWT_SECRET="$(require_env_value JWT_SECRET)"
RESEND_API_KEY="$(require_env_value RESEND_API_KEY)"
RESEND_FROM="$(require_env_value RESEND_FROM)"
CLOUDFLARE_ORIGIN_CERT_HOST_FILE="$(require_env_value CLOUDFLARE_ORIGIN_CERT_HOST_FILE)"
CLOUDFLARE_ORIGIN_KEY_HOST_FILE="$(require_env_value CLOUDFLARE_ORIGIN_KEY_HOST_FILE)"

for required_file in "$CLOUDFLARE_ORIGIN_CERT_HOST_FILE" "$CLOUDFLARE_ORIGIN_KEY_HOST_FILE"; do
  [ -f "$required_file" ] || fail "Missing file: $required_file"
done

git fetch --all --prune
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

IMAGE_TAG="${IMAGE_TAG_OVERRIDE:-$DEFAULT_IMAGE_TAG}"

export API_IMAGE WEB_IMAGE IMAGE_TAG MARIADB_DATABASE MARIADB_USER MARIADB_PASSWORD
export APP_PUBLIC_URL JWT_SECRET RESEND_API_KEY RESEND_FROM
export CLOUDFLARE_ORIGIN_CERT_HOST_FILE CLOUDFLARE_ORIGIN_KEY_HOST_FILE

printf '%s' "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USERNAME" --password-stdin
docker compose --env-file "$ENV_FILE" $COMPOSE_ARGS pull
docker compose --env-file "$ENV_FILE" $COMPOSE_ARGS up -d --no-build --remove-orphans
docker compose --env-file "$ENV_FILE" $COMPOSE_ARGS ps
echo "Deployed IMAGE_TAG=$IMAGE_TAG"
