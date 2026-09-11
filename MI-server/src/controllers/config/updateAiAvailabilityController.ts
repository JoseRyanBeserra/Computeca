// src/controllers/config/updateAiAvailabilityController.ts
import type { FastifyRequest, FastifyReply } from 'fastify'
import { updateAiAvailabilityService } from '../../services/config/updateAiAvailabilityService'
import type { UpdateAiAvailabilityRequest } from '../../schemas/config/updateAiAvailabilitySchema'
import { createInspectionLog } from '../../repositories/inspectionLog/inspectionLogRepository'
import { authorizeByRole } from '../../utils/authorizeByRole'
import { ADMIN } from '../../constants/roles'
import { httpResponse, httpError } from '../../utils/http'
import { StatusCode } from '../../utils/statusCode'
import { logger } from '../../lib/logger'

const ctx = 'updateAiAvailabilityController'

/**
 * PATCH /config/features/ai — altera a disponibilidade da IA (ADMIN)
 *
 * Body: { enabled: boolean }
 *
 * Middlewares: [authenticate]
 * Autorização: ADMIN, verificada in-function.
 *
 * Responde 409 AI_NOT_MANAGEABLE quando a instalação não tem suporte a IA
 * habilitado no ambiente — nesse caso nada é gravado.
 */
export async function updateAiAvailabilityController(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  logger.info(`IN - ${ctx}`)

  const body = request.body as UpdateAiAvailabilityRequest

  await createInspectionLog({
    correlationId: request.user.sub,
    context:       ctx,
    direction:     'CLIENT_TO_SERVER',
    payload:       [{ title: 'Alteração de disponibilidade da IA', content: { enabled: body?.enabled } }],
  }).catch((err) => logger.error({ err }, `${ctx}: inspectionLog CLIENT_TO_SERVER write failed`))

  try {
    authorizeByRole(request.user.role, [ADMIN])

    const result = await updateAiAvailabilityService({
      enabled:     body.enabled,
      updatedById: request.user.sub,
      actorRole:   request.user.role as 'ADMIN',
    })

    await createInspectionLog({
      correlationId: request.user.sub,
      context:       ctx,
      direction:     'SERVER_TO_CLIENT',
      payload:       [{ title: 'Disponibilidade da IA alterada', content: result }],
    }).catch((err) => logger.error({ err }, `${ctx}: inspectionLog SERVER_TO_CLIENT write failed`))

    httpResponse({ reply, statusCode: StatusCode.OK, data: result, context: ctx })
  } catch (error) {
    await createInspectionLog({
      correlationId: request.user.sub,
      context:       ctx,
      direction:     'SERVER_TO_CLIENT',
      payload:       [{
        title:   'Erro - alteração de disponibilidade da IA',
        content: { message: (error as Error).message },
      }],
    }).catch((err) => logger.error({ err }, `${ctx}: inspectionLog ERROR write failed`))

    httpError({ error, context: ctx })
  }
}
