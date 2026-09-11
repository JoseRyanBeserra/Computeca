// src/controllers/organizations/removeMemberController.ts
import type { FastifyRequest, FastifyReply } from 'fastify'
import { removeMemberService } from '../../../services/organizations/members/removeMemberService'
import { createInspectionLog } from '../../../repositories/inspectionLog/inspectionLogRepository'
import { httpResponse, httpError } from '../../../utils/http'
import { StatusCode } from '../../../utils/statusCode'
import { GeneralErrorResponse } from '../../../errors/GeneralErrorResponse'
import { logger } from '../../../lib/logger'
const ctx = 'removeMemberController'

export async function removeMemberController(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  logger.info(`IN - ${ctx}`)

  const params = request.params as { orgId?: unknown; userId?: unknown }

  await createInspectionLog({
    correlationId: request.user.sub,
    context:       ctx,
    direction:     'CLIENT_TO_SERVER',
    payload: [{ title: 'Request Payload', content: { method: request.method, url: request.url, orgId: params.orgId, targetUserId: params.userId } }],
  }).catch((err) => logger.error({ err }, `${ctx}: inspectionLog CLIENT_TO_SERVER write failed`))

  try {
    await removeMemberService({
      orgId:            params.orgId,
      targetUserId:     params.userId,
      requestingUserId: request.user.sub,
    })

    await createInspectionLog({
      correlationId: request.user.sub,
      context:       ctx,
      direction:     'SERVER_TO_CLIENT',
      payload: [
        { title: 'DB - Membro removido', content: { orgId: params.orgId, targetUserId: params.userId } },
        { title: 'Resposta', content: { statusCode: StatusCode.NO_CONTENT } },
      ],
    }).catch((err) => logger.error({ err }, `${ctx}: inspectionLog SERVER_TO_CLIENT write failed`))

    httpResponse({ reply, statusCode: StatusCode.NO_CONTENT, data: undefined, context: ctx })
  } catch (error) {
    await createInspectionLog({
      correlationId: request.user.sub,
      context:       ctx,
      direction:     'SERVER_TO_CLIENT',
      payload: [
        {
          title:   'Erro - Remover membro',
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

