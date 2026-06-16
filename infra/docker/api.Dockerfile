FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/domain/package.json packages/domain/package.json
RUN npm install

FROM deps AS build
COPY . .
RUN npm run prisma:generate -w @rescuebase/api
RUN npm run build -w @rescuebase/domain
RUN npm run build -w @rescuebase/api

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update \
  && apt-get install -y --no-install-recommends age default-mysql-client openssl \
  && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/package.json /app/package.json
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/packages/domain/dist /app/packages/domain/dist
COPY --from=build /app/packages/domain/package.json /app/packages/domain/package.json
COPY --from=build /app/apps/api/dist /app/apps/api/dist
COPY --from=build /app/apps/api/prisma /app/apps/api/prisma
COPY --from=build /app/apps/api/package.json /app/apps/api/package.json
COPY --from=build /app/infra/backups /app/infra/backups
EXPOSE 3000
CMD ["sh", "-c", "npm run prisma:deploy -w @rescuebase/api && if [ \"$RESCUEBASE_SEED_DEV_DATA\" = \"true\" ]; then npm run prisma:seed -w @rescuebase/api; fi && node apps/api/dist/main.js"]
