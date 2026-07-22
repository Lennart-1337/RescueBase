FROM node:24.18-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/domain/package.json packages/domain/package.json
RUN npm ci

FROM deps AS build
COPY . .
RUN npm run build -w @rescuebase/web

FROM caddy:2.11 AS runtime
COPY --from=build /app/apps/web/dist /usr/share/caddy
COPY infra/docker/web.Caddyfile /etc/caddy/Caddyfile
