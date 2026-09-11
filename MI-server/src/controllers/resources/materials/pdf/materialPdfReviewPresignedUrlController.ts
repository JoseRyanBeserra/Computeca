// src/controllers/resources/materials/pdf/materialPdfReviewPresignedUrlController.ts
import type { FastifyRequest, FastifyReply } from 'fastify'
import { materialPdfPresignedUrlService } from '../../../../services/resources/materials/pdf/materialPdfPresignedUrlService'
import { authorizeByRole } from '../../../../utils/authorizeByRole'
import { PROFESSOR, ADMIN } from '../../../../constants/roles'
import { httpResponse, httpError } from '../../../../utils/http'
import { StatusCode } from '../../../../utils/statusCode'
import { logger } from '../../../../lib/logger'

const ctx = 'materialPdfReviewPresignedUrlController'

/**
 * GET /mis/:id/review-presigned-url
 *
 * Gera URL pré-assinada (1h) para o professor visualizar qualquer PDF
 * durante o processo de revisão, sem restrição de ownership.
 *
 * Permissão: PROFESSOR, ADMIN.
 * Middlewares: [authenticate]
 */
export async function materialPdfReviewPresignedUrlController(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  logger.info(`IN - ${ctx}`)

  try {
    authorizeByRole(request.user.role, [PROFESSOR, ADMIN])

    const { id } = request.params as { id: string }

    const result = await materialPdfPresignedUrlService({ materialId: id })

    httpResponse({ reply, statusCode: StatusCode.OK, data: result, context: ctx })
  } catch (error) {
    httpError({ error, context: ctx })
  }
}
