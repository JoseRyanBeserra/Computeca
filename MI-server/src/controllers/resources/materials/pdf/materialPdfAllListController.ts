// src/controllers/resources/materials/pdf/materialPdfAllListController.ts
import type { FastifyRequest, FastifyReply } from 'fastify'
import { materialPdfAllListService } from '../../../../services/resources/materials/pdf/materialPdfAllListService'
import { authorizeByRole } from '../../../../utils/authorizeByRole'
import { PROFESSOR, ADMIN } from '../../../../constants/roles'
import { httpResponse, httpError } from '../../../../utils/http'
import { StatusCode } from '../../../../utils/statusCode'
import { logger } from '../../../../lib/logger'

const ctx = 'materialPdfAllListController'

/**
 * GET /mis/all
 *
 * Lista todos os materiais instrucionais da plataforma com dados do autor.
 * Suporta filtro por status (PENDING_REVIEW | APPROVED | REJECTED) e paginação.
 *
 * Permissão: PROFESSOR, ADMIN.
 * Middlewares: [authenticate]
 */
export async function materialPdfAllListController(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  logger.info(`IN - ${ctx}`)

  try {
    authorizeByRole(request.user.role, [PROFESSOR, ADMIN])

    const result = await materialPdfAllListService(request.query)

    httpResponse({ reply, statusCode: StatusCode.OK, data: result, context: ctx })
  } catch (error) {
    httpError({ error, context: ctx })
  }
}
