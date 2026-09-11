// src/controllers/organizations/inviteUserController.ts
import type { FastifyRequest, FastifyReply } from 'fastify'
import { inviteUserService } from '../../../services/organizations/invites/inviteUserService'
import { createInspectionLog } from '../../../repositories/inspectionLog/inspectionLogRepository'
import { httpResponse, httpError } from '../../../utils/http'
import { StatusCode } from '../../../utils/statusCode'
import { GeneralErrorResponse } from '../../../errors/GeneralErrorResponse'
import { logger } from '../../../lib/logger'
const ctx = 'inviteUserController'

export async function inviteUserController(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  logger.info(`IN - ${ctx}`)

  const params = request.params as { orgId?: unknown }
  const body   = request.body   as { email?: unknown }

  await createInspectionLog({
    correlationId: request.user.sub,
    context:       ctx,
    direction:     'CLIENT_TO_SERVER',
    payload: [{ title: 'Request Payload', content: { method: request.method, url: request.url, orgId: params.orgId, email: body.email } }],
  }).catch((err) => logger.error({ err }, `${ctx}: inspectionLog CLIENT_TO_SERVER write failed`))

  try {
    const invite = await inviteUserService({
      orgId:        params.orgId,
      invitedEmail: body.email,
      invitedById:  request.user.sub,
    })

    await createInspectionLog({
      correlationId: request.user.sub,
      context:       ctx,
      direction:     'SERVER_TO_CLIENT',
      payload: [
        { title: 'DB - Convite enviado', content: { inviteId: invite.id } },
        { title: 'Resposta', content: { statusCode: StatusCode.CREATED } },
      ],
    }).catch((err) => logger.error({ err }, `${ctx}: inspectionLog SERVER_TO_CLIENT write failed`))

    httpResponse({ reply, statusCode: StatusCode.CREATED, data: invite, context: ctx })
  } catch (error) {
    await createInspectionLog({
      correlationId: request.user.sub,
      context:       ctx,
      direction:     'SERVER_TO_CLIENT',
      payload: [
        {
          title:   'Erro - Enviar convite',
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

