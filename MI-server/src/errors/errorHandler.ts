// src/errors/errorHandler.ts
import type { FastifyReply, FastifyRequest } from 'fastify'
import { ZodError } from 'zod'
import { GeneralErrorResponse } from './GeneralErrorResponse'

// Códigos de erro injetados por @fastify/multipart
const MULTIPART_FILE_TOO_LARGE = 'FST_REQ_FILE_TOO_LARGE'

// Código de erro de validação de schema no nível da rota (@fastify/type-provider-zod)
const FST_VALIDATION_ERROR = 'FST_ERR_VALIDATION'

export function errorHandler(
  error: Error & { code?: string; statusCode?: number },
  _request: FastifyRequest,
  reply: FastifyReply,
): void {
  if (error instanceof ZodError) {
    reply.status(422).send({
      status: 'error',
      message: 'Validation error',
      issues: error.flatten().fieldErrors,
    })
    return
  }

  if (error instanceof GeneralErrorResponse) {
    reply.status(error.statusCode).send({
      status: 'error',
      message: error.message,
      code: error.code,
    })
    return
  }

  // Arquivo maior que o limite configurado no plugin @fastify/multipart
  if (error.code === MULTIPART_FILE_TOO_LARGE) {
    reply.status(413).send({
      status: 'error',
      message: 'O arquivo excede o tamanho máximo permitido.',
      code: 'FILE_TOO_LARGE',
    })
    return
  }

  // Falha de validação de schema no nível da rota (body/params/query) —
  // tratada como erro de entrada (422), mesmo padrão do ZodError acima.
  if (error.code === FST_VALIDATION_ERROR) {
    reply.status(422).send({
      status: 'error',
      message: 'Validation error',
      issues: (error as Error & { validation?: unknown }).validation,
    })
    return
  }

  console.error(error)
  reply.status(500).send({
    status: 'error',
    message: 'Internal server error',
  })
}
