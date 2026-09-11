// src/app.ts
import fastify from 'fastify'
import fastifyJwt from '@fastify/jwt'
import fastifyCookie from '@fastify/cookie'
import fastifyCors from '@fastify/cors'
import fastifyRateLimit from '@fastify/rate-limit'
import fastifyMultipart from '@fastify/multipart'
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from '@fastify/type-provider-zod'
import { env } from './env'
import { prisma } from './database/prisma'
import { logger, otelLogsAtivo } from './lib/logger'
import { errorHandler } from './errors/errorHandler'
import { authRoutes } from './routes/auth/authRoutes'
import { usersRoutes } from './routes/users/usersRoutes'
import { materialPdfUploadRoutes } from './routes/resources/materials/pdf/materialPdfUploadRoutes'
import { logsRoutes } from './routes/logs/logsRoutes'
import { organizationsRoutes } from './routes/organizations/organizationsRoutes'
import { nomearSpanHttp } from './lib/tracing'

export function buildApp() {
  const app = fastify({
    // Mesmo motivo do src/lib/logger.ts: com o transport pino-pretty ativo os
    // logs saem por uma worker thread e não chegam ao Loki.
    logger:
      env.NODE_ENV === 'development' && !otelLogsAtivo
        ? {
            transport: {
              target: 'pino-pretty',
              options: { colorize: true, translateTime: 'SYS:standard' },
            },
          }
        : env.NODE_ENV === 'test'
          ? false
          : true,
  }).withTypeProvider<ZodTypeProvider>()

  // ── Compiladores Zod ─────────────────────────────────────────────────────────
  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  // ── Telemetria ───────────────────────────────────────────────────────────────
  // Nomeia o span HTTP raiz com a rota (`POST /mis` em vez de só `POST`), para
  // que os fluxos sejam identificáveis na lista de traces do Grafana.
  app.addHook('onRequest', async (request) => {
    nomearSpanHttp(request.method, request.routeOptions?.url)
  })

  // ── Plugins globais ──────────────────────────────────────────────────────────
  app.register(fastifyCors, {
    origin:         env.NODE_ENV === 'production' ? env.APP_URL : true,
    credentials:    true,
    methods:        ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Accept', 'Content-Type', 'Authorization'],
  })

  app.register(fastifyCookie)

  app.register(fastifyJwt, {
    secret: env.JWT_SECRET,
    cookie: {
      cookieName: 'refreshToken',
      signed: false,
    },
  })

  app.register(fastifyRateLimit, {
    global: false,
    // Configuração por rota via { config: { rateLimit: { max, timeWindow } } }
  })

  // Plugin de multipart/form-data (upload de arquivos)
  // O limite de tamanho por arquivo é definido aqui; rotas específicas podem
  // sobrescrever o bodyLimit do Fastify via opção de rota.
  app.register(fastifyMultipart, {
    limits: {
      files:    1,                                             // máx. 1 arquivo por request
      fileSize: env.MI_MAX_FILE_SIZE_MB * 1024 * 1024,        // limite em bytes
      fields:   5,                                             // máx. 5 campos de texto
    },
  })

  // ── Rotas de health ──────────────────────────────────────────────────────────
  app.get('/health', async (_request, reply) => {
    const timestamp = new Date().toISOString()

    try {
      // Checagem de conectividade com o banco (Postgres via Prisma)
      await prisma.$queryRaw`SELECT 1`

      return reply.status(200).send({
        status:    'ok',
        service:   'MI-server',
        database:  'ok',
        timestamp,
      })
    } catch (error) {
      logger.error({ err: error }, '/health: database check failed')

      return reply.status(503).send({
        status:    'error',
        service:   'MI-server',
        database:  'down',
        timestamp,
      })
    }
  })

  app.get('/ping', async (_request, reply) => {
    const timestamp = new Date().toISOString()

    try {
      // Checagem de conectividade com o banco (Postgres via Prisma)
      await prisma.$queryRaw`SELECT 1`

      return reply.status(200).send({
        status:    'ok',
        service:   'eq15',
        database:  'ok',
        timestamp,
      })
    } catch (error) {
      logger.error({ err: error }, '/ping: database check failed')

      return reply.status(503).send({
        status:    'error',
        service:   'eq15',
        database:  'down',
        timestamp,
      })
    }
  })

  // ── Rotas de domínio ─────────────────────────────────────────────────────────
  app.register(authRoutes, { prefix: '/auth' })
  app.register(usersRoutes, { prefix: '/users' })
  app.register(materialPdfUploadRoutes, { prefix: '/mis' })
  app.register(logsRoutes, { prefix: '/logs' })
  app.register(organizationsRoutes, { prefix: '/organizations' })

  // ── Handler global de erros ──────────────────────────────────────────────────
  app.setErrorHandler(errorHandler)

  return app
}
