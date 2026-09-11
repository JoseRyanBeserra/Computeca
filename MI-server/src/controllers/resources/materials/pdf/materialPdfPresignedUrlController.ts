// src/controllers/resources/materials/pdf/materialPdfPresignedUrlController.ts
import type { FastifyRequest, FastifyReply } from 'fastify'
import { materialPdfPresignedUrlService } from '../../../../services/resources/materials/pdf/materialPdfPresignedUrlService'
import { authorizeByRole } from '../../../../utils/authorizeByRole'
import { INSTITUTIONALIZED, PROFESSOR, ADMIN } from '../../../../constants/roles'
import { ERRORS, buildError } from '../../../../lib/errors/errors'
import { GeneralErrorResponse } from '../../../../errors/GeneralErrorResponse'
import { StatusCode } from '../../../../utils/statusCode'
import { httpResponse, httpError } from '../../../../utils/http'
import { logger } from '../../../../lib/logger'

const ctx = 'materialPdfPresignedUrlController'

/**
 * GET /mis/:id/presigned-url
 *
 * Gera uma URL pré-assinada (validade: 1h) para visualização do próprio PDF.
 * Apenas o dono do material pode solicitar a URL.
 *
 * Permissão: INSTITUTIONALIZED, PROFESSOR ou ADMIN.
 * Middlewares: [authenticate]
 */
export async function materialPdfPresignedUrlController(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  logger.info(`IN - ${ctx}`)

  try {
    authorizeByRole(request.user.role, [INSTITUTIONALIZED, PROFESSOR, ADMIN])

    const { id } = request.params as { id: string }

    const result = await materialPdfPresignedUrlService(
      { materialId: id },
      (material) => {
        if (material.uploadedById !== request.user.sub) {
          throw new GeneralErrorResponse(
            StatusCode.FORBIDDEN,
            buildError(ERRORS.ERRORS_RESOURCES.MI_NOT_OWNED_BY_USER),
          )
        }
      },
    )

    httpResponse({ reply, statusCode: StatusCode.OK, data: result, context: ctx })
  } catch (error) {
    httpError({ error, context: ctx })
  }
}
