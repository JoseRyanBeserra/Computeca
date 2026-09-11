// src/controllers/users/setUserAsProfessorController.ts
import type { FastifyRequest, FastifyReply } from 'fastify'
import { setUserAsProfessorService } from '../../services/users/setUserAsProfessorService'
import { createInspectionLog } from '../../repositories/inspectionLog/inspectionLogRepository'
import { authorizeByRole } from '../../utils/authorizeByRole'
import { ADMIN } from '../../constants/roles'
import { httpResponse, httpError } from '../../utils/http'
import { StatusCode } from '../../utils/statusCode'
import { GeneralErrorResponse } from '../../errors/GeneralErrorResponse'
import { logger } from '../../lib/logger'

const ctx = 'setUserAsProfessorController'

/**
 * PATCH /users/:id/set-professor
 *
 * Promove um usuário para o cargo de PROFESSOR.
 * Exclusivo para ADMIN. Não é permitido alterar o cargo de outro ADMIN.
 *
 * Middlewares: [authenticate]
 */
export async function setUserAsProfessorController(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  logger.info(`IN - ${ctx}`)

  const { id: targetUserId } = request.params as { id: string }

  await createInspectionLog({
    correlationId: request.user.sub,
    context:       ctx,
    direction:     'CLIENT_TO_SERVER',
    payload: [
      {
        title:   'Request Payload',
        content: {
          method:       request.method,
          url:          request.url,
          targetUserId,
        },
      },
    ],
  }).catch((err) => logger.error({ err }, `${ctx}: inspectionLog CLIENT_TO_SERVER write failed`))

  try {
    authorizeByRole(request.user.role, [ADMIN])

    const user = await setUserAsProfessorService({
      targetUserId,
      requestingAdminId: request.user.sub,
    })

    await createInspectionLog({
      correlationId: request.user.sub,
      context:       ctx,
      direction:     'SERVER_TO_CLIENT',
      payload: [
        {
          title:   'DB - Usuário promovido a Professor',
          content: { id: user.id, email: user.email, role: user.role },
        },
        {
          title:   'Resposta',
          content: { statusCode: StatusCode.OK },
        },
      ],
    }).catch((err) => logger.error({ err }, `${ctx}: inspectionLog SERVER_TO_CLIENT write failed`))

    httpResponse({ reply, statusCode: StatusCode.OK, data: user, context: ctx })
  } catch (error) {
    await createInspectionLog({
      correlationId: request.user.sub,
      context:       ctx,
      direction:     'SERVER_TO_CLIENT',
      payload: [
        {
          title:   'Erro - Promoção a Professor',
          content: {
            message: error instanceof Error ? error.message : String(error),
            code:    error instanceof GeneralErrorResponse ? error.code : 'INTERNAL_ERROR',
          },
        },
      ],
    }).catch((err) => logger.error({ err }, `${ctx}: inspectionLog ERROR write failed`))

    httpError({ error, context: ctx })
  }
}
