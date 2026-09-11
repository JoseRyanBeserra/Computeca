// src/controllers/resources/materials/pdf/materialPdfDeleteController.ts
import type { FastifyRequest, FastifyReply } from 'fastify'
import type { Role } from '@prisma/client'
import { materialPdfDeleteService } from '../../../../services/resources/materials/pdf/materialPdfDeleteService'
import { authorizeByRole } from '../../../../utils/authorizeByRole'
import { PROFESSOR, ADMIN } from '../../../../constants/roles'
import { httpResponse, httpError } from '../../../../utils/http'
import { StatusCode } from '../../../../utils/statusCode'
import { logger } from '../../../../lib/logger'

const ctx = 'materialPdfDeleteController'

/**
 * DELETE /mis/:id
 *
 * Soft delete de um material instrucional — oculta o material das listagens e da
 * visualização sem apagá-lo do banco.
 *
 * Permissão: PROFESSOR, ADMIN (podem deletar qualquer material).
 * Middlewares: [authenticate]
 */
export async function materialPdfDeleteController(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  logger.info(`IN - ${ctx}`)

  try {
    authorizeByRole(request.user.role, [PROFESSOR, ADMIN])

    const { id } = request.params as { id: string }

    const deleted = await materialPdfDeleteService({
      materialId:  id,
      deletedById: request.user.sub,
      actorRole:   request.user.role as Role,
    })

    httpResponse({ reply, statusCode: StatusCode.OK, data: deleted, context: ctx })
  } catch (error) {
    httpError({ error, context: ctx })
  }
}
