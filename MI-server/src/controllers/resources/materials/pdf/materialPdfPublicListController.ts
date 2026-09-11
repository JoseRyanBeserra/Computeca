// src/controllers/resources/materials/pdf/materialPdfPublicListController.ts
import type { FastifyRequest, FastifyReply } from 'fastify'
import { materialPdfPublicListService } from '../../../../services/resources/materials/pdf/materialPdfPublicListService'
import { httpResponse, httpError } from '../../../../utils/http'
import { StatusCode } from '../../../../utils/statusCode'
import { logger } from '../../../../lib/logger'

const ctx = 'materialPdfPublicListController'

/**
 * GET /mis/public
 *
 * Lista apenas materiais com status APPROVED — acessível a todos os usuários autenticados.
 * Resposta: { materials[], total, page, perPage }
 *
 * Middlewares: [authenticate]
 */
export async function materialPdfPublicListController(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  logger.info(`IN - ${ctx}`)

  try {
    const result = await materialPdfPublicListService(request.query)
    httpResponse({ reply, statusCode: StatusCode.OK, data: result, context: ctx })
  } catch (error) {
    httpError({ error, context: ctx })
  }
}
