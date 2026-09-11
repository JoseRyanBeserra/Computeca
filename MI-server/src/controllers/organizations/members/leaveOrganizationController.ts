// src/controllers/organizations/leaveOrganizationController.ts
import type { FastifyRequest, FastifyReply } from 'fastify'
import { leaveOrganizationService } from '../../../services/organizations/members/leaveOrganizationService'
import { createInspectionLog } from '../../../repositories/inspectionLog/inspectionLogRepository'
import { httpResponse, httpError } from '../../../utils/http'
import { StatusCode } from '../../../utils/statusCode'
import { GeneralErrorResponse } from '../../../errors/GeneralErrorResponse'
import { logger } from '../../../lib/logger'
const ctx = 'leaveOrganizationController'

export async function leaveOrganizationController(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  logger.info(`IN - ${ctx}`)

  const params = request.params as { orgId?: unknown }

  await createInspectionLog({
    correlationId: request.user.sub,
    context:       ctx,
    direction:     'CLIENT_TO_SERVER',
    payload: [{ title: 'Request Payload', content: { method: request.method, url: request.url, orgId: params.orgId } }],
  }).catch((err) => logger.error({ err }, `${ctx}: inspectionLog CLIENT_TO_SERVER write failed`))

  try {
    await leaveOrganizationService({ orgId: params.orgId, userId: request.user.sub })

    await createInspectionLog({
      correlationId: request.user.sub,
      context:       ctx,
      direction:     'SERVER_TO_CLIENT',
      payload: [
        { title: 'DB - Usuário saiu da organização', content: { orgId: params.orgId } },
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
          title:   'Erro - Sair da organização',
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

