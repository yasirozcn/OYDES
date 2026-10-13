# Canlı imaj: Next.js "standalone" çıktısı (yalnızca gereken dosyalar). Derleme ve çalıştırma: deploy/docker-compose.yml
# Şema bu imajdan uygulanmaz: veritabanı infra/dev-db'dedir, şemayı proje sahibi kur.sh ile uygular.
FROM node:22-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN mkdir -p public && npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/public ./public
# Yönetici hesabı açma betiği (docker compose exec app node scripts/create-admin.mjs …).
# Standalone çıktısı betiklerin paketlerini içermediği için ayrıca kurulur.
COPY --chown=app:app scripts/create-admin.mjs ./scripts/
RUN cd scripts && echo "{}" > package.json && npm install --no-package-lock --no-fund --no-audit pg@8.23.1 bcryptjs@3.0.3 && chown -R app:app /app/scripts
USER app
EXPOSE 3000
CMD ["node", "server.js"]
