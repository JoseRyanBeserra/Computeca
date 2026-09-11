// src/controllers/resources/materials/pdf/materialPdfReviewController.ts
import type { FastifyRequest, FastifyReply } from 'fastify'
import { materialPdfReviewService } from '../../../../services/resources/materials/pdf/materialPdfReviewService'
import { authorizeByRole } from '../../../../utils/authorizeByRole'
import { PROFESSOR, ADMIN } from '../../../../constants/roles'
import { httpResponse, httpError } from '../../../../utils/http'
import { StatusCode } from '../../../../utils/statusCode'
import { logger } from '../../../../lib/logger'

const ctx = 'materialPdfReviewController'

/**
 * PATCH /mis/:id/review
 *
 * Aprova ou rejeita um material instrucional pendente.
 * Body: { decision: 'APPROVED' | 'REJECTED' }
 *
 * Validações no service:
 *   - materialId e reviewerId devem ser UUID v4 válidos
 *   - material deve existir e estar com status PENDING_REVIEW
 *
 * Permissão: PROFESSOR, ADMIN.
 * Middlewares: [authenticate]
 */
export async function materialPdfReviewController(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  logger.info(`IN - ${ctx}`)

  try {
    authorizeByRole(request.user.role, [PROFESSOR, ADMIN])

    const { id } = request.params as { id: string }
    const { decision } = request.body as { decision: string }

    const updated = await materialPdfReviewService({
      materialId: id,
      decision,
      reviewerId: request.user.sub,
    })

    httpResponse({ reply, statusCode: StatusCode.OK, data: updated, context: ctx })
  } catch (error) {
    httpError({ error, context: ctx })
  }
}
