// src/controllers/resources/materials/pdf/materialPdfPublicPresignedUrlController.ts
import type { FastifyRequest, FastifyReply } from 'fastify'
import { materialPdfPresignedUrlService } from '../../../../services/resources/materials/pdf/materialPdfPresignedUrlService'
import { ERRORS, buildError } from '../../../../lib/errors/errors'
import { GeneralErrorResponse } from '../../../../errors/GeneralErrorResponse'
import { StatusCode } from '../../../../utils/statusCode'
import { httpResponse, httpError } from '../../../../utils/http'
import { logger } from '../../../../lib/logger'

const ctx = 'materialPdfPublicPresignedUrlController'

/**
 * GET /mis/:id/public-presigned-url
 *
 * Gera URL pré-assinada (1h) para visualização de um material APROVADO.
 * Acessível a todos os usuários autenticados — retorna 404 se o material
 * não existir ou não estiver aprovado (sem revelar se existe ou não).
 *
 * Middlewares: [authenticate]
 */
export async function materialPdfPublicPresignedUrlController(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  logger.info(`IN - ${ctx}`)

  try {
    const { id } = request.params as { id: string }

    const result = await materialPdfPresignedUrlService(
      { materialId: id },
      (material) => {
        if (material.status !== 'APPROVED') {
          throw new GeneralErrorResponse(StatusCode.NOT_FOUND, buildError(ERRORS.ERRORS_RESOURCES.MI_NOT_FOUND))
        }
      },
    )

    httpResponse({ reply, statusCode: StatusCode.OK, data: result, context: ctx })
  } catch (error) {
    httpError({ error, context: ctx })
  }
}
