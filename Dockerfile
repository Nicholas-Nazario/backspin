FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-bookworm-slim AS catalog
ARG DISCOGS_MASTERS_SNAPSHOT
RUN mkdir /catalog
RUN if [ -n "$DISCOGS_MASTERS_SNAPSHOT" ]; then \
      set -eu; \
      echo "$DISCOGS_MASTERS_SNAPSHOT" | grep -Eq '^[0-9]{8}$'; \
      apt-get update; \
      apt-get install -y --no-install-recommends ca-certificates curl; \
      base="https://github.com/Nicholas-Nazario/backspin/releases/download/discogs-masters-$DISCOGS_MASTERS_SNAPSHOT"; \
      cd /catalog; \
      curl --fail --silent --show-error --location --retry 3 "$base/discogs-masters.sqlite.gz" -o discogs-masters.sqlite.gz; \
      curl --fail --silent --show-error --location --retry 3 "$base/discogs-masters.sqlite.gz.sha256" -o discogs-masters.sqlite.gz.sha256; \
      sha256sum --check discogs-masters.sqlite.gz.sha256; \
      gzip -d discogs-masters.sqlite.gz; \
      rm discogs-masters.sqlite.gz.sha256; \
    fi
FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000 DATABASE_PATH=/data/mystery.sqlite
RUN mkdir /data && chown node:node /data
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
COPY --from=catalog --chown=node:node /catalog /app/catalog
ENV DISCOGS_MASTER_INDEX_PATH=/app/catalog/discogs-masters.sqlite
USER node
EXPOSE 3000
CMD ["node","server.js"]
