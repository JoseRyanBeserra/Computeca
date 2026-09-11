// src/utils/http.ts
// Utilitários HTTP puros para controllers.
// Responsabilidade única: logar no console e enviar/lançar a resposta HTTP.
// O registro de InspectionLog é responsabilidade do controller.

import type { FastifyReply } from 'fastify'
import { logger } from '../lib/logger'

// ── httpResponse ───────────────────────────────────────────────────────────────

interface HttpResponseOptions<T> {
  reply: FastifyReply
  statusCode: number
  data: T
  /** Nome da função/handler para rastreio no console */
  context: string
}

/**
 * Finaliza a requisição com sucesso:
 * 1. Loga OUT no console
 * 2. Envia a resposta HTTP
 */
export function httpResponse<T>({
  reply,
  statusCode,
  data,
  context,
}: HttpResponseOptions<T>): void {
  logger.info(`OUT - ${context}`)
  reply.status(statusCode).send(data)
}

// ── httpError ─────────────────────────────────────────────────────────────────

interface HttpErrorOptions {
  error: unknown
  /** Nome da função/handler para rastreio no console */
  context: string
}

/**
 * Trata um erro na requisição:
 * 1. Loga ERROR no console
 * 2. Re-lança o erro para o errorHandler global do Fastify
 */
export function httpError({ error, context }: HttpErrorOptions): never {
  // Chave `err` (e não `error`): é o nome que o serializer padrão do Pino
  // reconhece, e só com ele a exceção sai com tipo, mensagem e stack trace
  // estruturados no log — inclusive no Loki, via OpenTelemetry.
  logger.error({ err: error, evento: 'erro_tratado', contexto: context }, `ERROR - ${context}`)
  throw error
}
