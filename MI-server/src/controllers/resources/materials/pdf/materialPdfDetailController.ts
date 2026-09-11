// src/controllers/resources/materials/pdf/materialPdfDetailController.ts
import type { FastifyRequest, FastifyReply } from 'fastify'
import { materialPdfDetailService } from '../../../../services/resources/materials/pdf/materialPdfDetailService'
import { PROFESSOR, ADMIN } from '../../../../constants/roles'
import { ERRORS, buildError } from '../../../../lib/errors/errors'
import { GeneralErrorResponse } from '../../../../errors/GeneralErrorResponse'
import { StatusCode } from '../../../../utils/statusCode'
import { httpResponse, httpError } from '../../../../utils/http'
import { logger } from '../../../../lib/logger'

const ctx = 'materialPdfDetailController'

/**
 * GET /mis/:id
 *
 * Retorna os metadados de um material específico (autor + habilidades BNCC).
 *
 * Acesso:
 *   - Materiais APPROVED: qualquer usuário autenticado
 *   - Demais status: apenas o dono ou PROFESSOR/ADMIN
 *   - Caso contrário: 404 (não revela a existência do material)
 *
 * Middlewares: [authenticate]
 */
export async function materialPdfDetailController(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  logger.info(`IN - ${ctx}`)

  try {
    const { id } = request.params as { id: string }

    const result = await materialPdfDetailService(
      { materialId: id },
      (material) => {
        const isOwner = material.uploadedById === request.user.sub
        const isStaff = request.user.role === PROFESSOR || request.user.role === ADMIN
        if (material.status !== 'APPROVED' && !isOwner && !isStaff) {
          throw new GeneralErrorResponse(
            StatusCode.NOT_FOUND,
            buildError(ERRORS.ERRORS_RESOURCES.MI_NOT_FOUND),
          )
        }
      },
    )

    httpResponse({ reply, statusCode: StatusCode.OK, data: result, context: ctx })
  } catch (error) {
    httpError({ error, context: ctx })
  }
}
