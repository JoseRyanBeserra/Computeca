// src/controllers/resources/materials/pdf/materialPdfListByUserController.ts
import type { FastifyRequest, FastifyReply } from 'fastify'
import { materialPdfListByUserService } from '../../../../services/resources/materials/pdf/materialPdfListByUserService'
import { authorizeByRole } from '../../../../utils/authorizeByRole'
import { INSTITUTIONALIZED, PROFESSOR, ADMIN } from '../../../../constants/roles'
import { httpResponse, httpError } from '../../../../utils/http'
import { StatusCode } from '../../../../utils/statusCode'
import { logger } from '../../../../lib/logger'

const ctx = 'materialPdfListByUserController'

/**
 * GET /mis/me
 *
 * Retorna todos os materiais instrucionais enviados pelo usuário autenticado,
 * ordenados do mais recente para o mais antigo.
 *
 * Autorização no controller:
 *   - Apenas INSTITUTIONALIZED, PROFESSOR e ADMIN podem acessar este recurso.
 *   - Usuários COMMON não possuem materiais uploadados — acesso negado.
 *
 * Validações no service:
 *   - userId não pode ser null/undefined (MISSING_ID)
 *   - userId deve ser um UUID v4 válido (INVALID_ID_FORMAT)
 *
 * Middlewares aplicados na rota:
 *   preHandler: [authenticate]
 */
export async function materialPdfListByUserController(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  logger.info(`IN - ${ctx}`)

  try {
    authorizeByRole(request.user.role, [INSTITUTIONALIZED, PROFESSOR, ADMIN])

    const materials = await materialPdfListByUserService({ userId: request.user.sub })

    httpResponse({ reply, statusCode: StatusCode.OK, data: materials, context: ctx })
  } catch (error) {
    httpError({ error, context: ctx })
  }
}
