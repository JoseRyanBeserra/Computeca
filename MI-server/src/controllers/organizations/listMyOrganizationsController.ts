// src/controllers/organizations/listMyOrganizationsController.ts
import type { FastifyRequest, FastifyReply } from 'fastify'
import { listMyOrganizationsService } from '../../services/organizations/listMyOrganizationsService'
import { createInspectionLog } from '../../repositories/inspectionLog/inspectionLogRepository'
import { httpResponse, httpError } from '../../utils/http'
import { StatusCode } from '../../utils/statusCode'
import { GeneralErrorResponse } from '../../errors/GeneralErrorResponse'
import { logger } from '../../lib/logger'
const ctx = 'listMyOrganizationsController'

export async function listMyOrganizationsController(
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
    const orgs = await listMyOrganizationsService({ userId: request.user.sub })

    await createInspectionLog({
      correlationId: request.user.sub,
      context:       ctx,
      direction:     'SERVER_TO_CLIENT',
      payload: [
        { title: 'DB - Organizações listadas', content: { count: orgs.length } },
        { title: 'Resposta', content: { statusCode: StatusCode.OK } },
      ],
    }).catch((err) => logger.error({ err }, `${ctx}: inspectionLog SERVER_TO_CLIENT write failed`))

    httpResponse({ reply, statusCode: StatusCode.OK, data: orgs, context: ctx })
  } catch (error) {
    await createInspectionLog({
      correlationId: request.user.sub,
      context:       ctx,
      direction:     'SERVER_TO_CLIENT',
      payload: [
        {
          title:   'Erro - Listar organizações',
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
