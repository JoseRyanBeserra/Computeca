// src/lib/logger.ts
// Logger de console global usando pino diretamente (independente do Fastify)
import pino from 'pino'

const env = process.env.NODE_ENV ?? 'development'

/**
 * O `pino-pretty` roda como transport em worker thread, e a instrumentação do
 * OpenTelemetry só enxerga o que passa pela stream do processo principal — com
 * ele ativo, nenhum log chega ao Loki. Quando a exportação de logs está ligada,
 * abrimos mão do log colorido para não perder um dos três sinais de telemetria.
 */
export const otelLogsAtivo = (process.env.OTEL_LOGS_EXPORTER ?? 'none') !== 'none'

export const logger = pino({
  level: env === 'test' ? 'silent' : env === 'production' ? 'info' : 'debug',

  transport:
    env === 'development' && !otelLogsAtivo
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
})
