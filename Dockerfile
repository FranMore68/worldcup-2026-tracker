# Dockerfile per a Coolify (FIFA World Cup 2026 Tracker)
# El codi Next.js es troba al subdirectori /app del repo

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar package.json (no hi ha package-lock.json al repo)
COPY app/package.json ./

# Instal·lar dependencies (inclou devDependencies per al build)
RUN npm install

# Copiar tot el codi de l'aplicació
COPY app/ ./

# Compilar l'aplicació
RUN npm run build

# Stage 2: Producció
FROM node:20-alpine AS runner

WORKDIR /app

# Variables d'entorn per a producció
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Copiar només el necessari des del builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Exposar el port
EXPOSE 3000

# Healthcheck (més temps d'espera per l'inici)
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

# Iniciar l'aplicació
CMD ["node", "server.js"]
