// src/controllers/resources/materials/pdf/materialPdfPendingListController.ts
import type { FastifyRequest, FastifyReply } from 'fastify'
import { materialPdfPendingListService } from '../../../../services/resources/materials/pdf/materialPdfPendingListService'
import { authorizeByRole } from '../../../../utils/authorizeByRole'
import { PROFESSOR, ADMIN } from '../../../../constants/roles'
import { httpResponse, httpError } from '../../../../utils/http'
import { StatusCode } from '../../../../utils/statusCode'
import { logger } from '../../../../lib/logger'

const ctx = 'materialPdfPendingListController'

/**
 * GET /mis/pending
 *
 * Lista todos os materiais com status PENDING_REVIEW para revisão docente.
 * Inclui dados do autor (nome e e-mail) para identificação.
 * Ordenados do mais antigo para o mais recente (fila de revisão).
 *
 * Permissão: PROFESSOR, ADMIN.
 * Middlewares: [authenticate]
 */
export async function materialPdfPendingListController(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  logger.info(`IN - ${ctx}`)

  try {
    authorizeByRole(request.user.role, [PROFESSOR, ADMIN])

    const materials = await materialPdfPendingListService({
      reviewerId:   request.user.sub,
      reviewerRole: request.user.role,
    })

    httpResponse({ reply, statusCode: StatusCode.OK, data: materials, context: ctx })
  } catch (error) {
    httpError({ error, context: ctx })
  }
}
