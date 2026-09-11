// src/controllers/organizations/listMyInvitesController.ts
import type { FastifyRequest, FastifyReply } from 'fastify'
import { listMyInvitesService } from '../../../services/organizations/invites/listMyInvitesService'
import { createInspectionLog } from '../../../repositories/inspectionLog/inspectionLogRepository'
import { httpResponse, httpError } from '../../../utils/http'
import { StatusCode } from '../../../utils/statusCode'
import { GeneralErrorResponse } from '../../../errors/GeneralErrorResponse'
import { logger } from '../../../lib/logger'
const ctx = 'listMyInvitesController'

export async function listMyInvitesController(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  logger.info(`IN - ${ctx}`)

  await createInspectionLog({
    correlationId: request.user.sub,
    context:       ctx,
    direction:     'CLIENT_TO_SERVER',
    payload: [{ title: 'Request Payload', content: { method: request.method, url: request.url } }],
  }).catch((err) => logger.error({ err }, `${ctx}: inspectionLog CLIENT_TO_SERVER write failed`))

  try {
    const invites = await listMyInvitesService({ userId: request.user.sub })

    await createInspectionLog({
      correlationId: request.user.sub,
      context:       ctx,
      direction:     'SERVER_TO_CLIENT',
      payload: [
        { title: 'DB - Convites listados', content: { count: invites.length } },
        { title: 'Resposta', content: { statusCode: StatusCode.OK } },
      ],
    }).catch((err) => logger.error({ err }, `${ctx}: inspectionLog SERVER_TO_CLIENT write failed`))

    httpResponse({ reply, statusCode: StatusCode.OK, data: invites, context: ctx })
  } catch (error) {
    await createInspectionLog({
      correlationId: request.user.sub,
      context:       ctx,
      direction:     'SERVER_TO_CLIENT',
      payload: [
        {
          title:   'Erro - Listar convites',
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

