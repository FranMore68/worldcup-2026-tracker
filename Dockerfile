# Dockerfile per a Coolify (FIFA World Cup 2026 Tracker)
# El codi Next.js es troba al subdirectori /app del repo

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Instal·lar dependencies
COPY app/package.json ./
RUN npm install

# Copiar tot el codi i fer build
COPY app/ ./
ENV NODE_OPTIONS=--max_old_space_size=4096
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 2: Producció
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Copiar només el necessari des del builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

# Iniciar l'aplicació (sense healthcheck, Coolify gestiona això)
CMD ["node", "server.js"]
