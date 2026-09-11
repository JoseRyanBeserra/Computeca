# ── Stage 1: Build da API ─────────────────────────────────────────────────────
FROM node:22-alpine AS api-builder
WORKDIR /api

COPY MI-server/package*.json ./
COPY MI-server/prisma ./prisma/
COPY MI-server/prisma.config.ts ./
RUN npm ci
RUN npx prisma generate

COPY MI-server/ .
RUN npm run build
RUN npx tsup prisma/seed.ts --format cjs --out-dir dist --no-splitting

# ── Stage 2: Build do frontend ────────────────────────────────────────────────
FROM node:20-alpine AS web-builder
WORKDIR /web

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

COPY front/package*.json ./
RUN npm ci

COPY front/ .
RUN npm run build

# ── Stage 3: Produção ─────────────────────────────────────────────────────────
FROM node:22-alpine AS production
ENV NODE_ENV=production


RUN apk add --no-cache nginx

WORKDIR /api

# Dependências de produção da API + client do Prisma
COPY MI-server/package*.json ./
COPY MI-server/prisma ./prisma/
COPY MI-server/prisma.config.ts ./
RUN npm ci --omit=dev && npx prisma generate

# Artefatos compilados da API
COPY --from=api-builder /api/dist ./dist

# Frontend estático servido pelo Nginx na porta 80
COPY --from=web-builder /web/dist /usr/share/nginx/html
# Alpine nginx usa http.d/, não conf.d/
RUN mkdir -p /etc/nginx/http.d
COPY front/nginx.conf /etc/nginx/http.d/default.conf

# Script de inicialização dos dois processos
COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 8080
CMD ["/start.sh"]
