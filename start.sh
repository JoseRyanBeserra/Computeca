#!/bin/sh
set -e

# Todas as variáveis são injetadas pelo portal do servidor via ~/app/.env
# Falha imediatamente se alguma obrigatória não estiver definida
: "${JWT_SECRET:?JWT_SECRET não definido}"
: "${ADMIN_EMAIL:?ADMIN_EMAIL não definido}"
: "${ADMIN_PASSWORD:?ADMIN_PASSWORD não definido}"
: "${DATABASE_URL:?DATABASE_URL não definido}"
: "${MINIO_ACCESS_KEY:?MINIO_ACCESS_KEY não definido}"
: "${MINIO_SECRET_KEY:?MINIO_SECRET_KEY não definido}"
: "${OPENAI_API_KEY:?OPENAI_API_KEY não definido}"

# Escreve .env temporário para o prisma.config.ts encontrar DATABASE_URL
printf 'DATABASE_URL=%s\n' "$DATABASE_URL" > /api/.env

# Aplica migrations pendentes (idempotente — seguro rodar a cada inicialização)
npx prisma migrate deploy

# Cria o admin inicial se ainda não existir (idempotente)
node /api/dist/seed.js

rm -f /api/.env

# Inicia Nginx em background (frontend na porta 80)
nginx &

# A telemetria é opt-in: só carrega o registro do OpenTelemetry quando
# OTEL_EXPORTER_OTLP_ENDPOINT estiver definido. Definir apenas as variáveis
# OTEL_* não basta — sem o --require, o SDK nunca é carregado e nada é
# exportado, silenciosamente.
OTEL_FLAG=""
if [ -n "${OTEL_EXPORTER_OTLP_ENDPOINT}" ]; then
  echo "▶ OpenTelemetry habilitado (serviço: ${OTEL_SERVICE_NAME:-nao definido})"
  OTEL_FLAG="--require @opentelemetry/auto-instrumentations-node/register"
fi

# Worker de vetorização em background.
#
# Sem ele, os jobs enfileirados na aprovação de um MI ficam parados no Redis
# para sempre: o material nunca sai de vectorStatus=PENDING e o chat com IA
# responde MI_NOT_VECTORIZED para qualquer pergunta.
echo "▶ Iniciando worker de vetorização"
node ${OTEL_FLAG} /api/dist/workers/vectorizeWorker.js &

# Node vira o processo principal (API na porta 3333)
exec node ${OTEL_FLAG} /api/dist/server.js
