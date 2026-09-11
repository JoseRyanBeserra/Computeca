# ──────────────────────────────────────────────────────────────────────────────
# Stage 1 — builder
# Instala TODAS as dependências (incluindo devDeps) e compila o TypeScript.
# ──────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

RUN npm ci
RUN npx prisma generate

COPY . .
RUN npm run build

# ──────────────────────────────────────────────────────────────────────────────
# Stage 2 — migrate
# Derivado do builder: tem a CLI do Prisma e o schema.
# Usado como serviço one-shot no docker-compose para rodar as migrations.
# ──────────────────────────────────────────────────────────────────────────────
FROM builder AS migrate
CMD ["npx", "prisma", "migrate", "deploy"]

# ──────────────────────────────────────────────────────────────────────────────
# Stage 3 — production
# Imagem enxuta: apenas dependências de produção + artefatos compilados.
# ──────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

RUN npm ci --omit=dev
RUN npx prisma generate

COPY --from=builder /app/dist ./dist

EXPOSE 3333
CMD ["node", "dist/server.js"]
