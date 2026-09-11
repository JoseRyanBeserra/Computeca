// src/controllers/organizations/listOrgMembersController.ts
import type { FastifyRequest, FastifyReply } from 'fastify'
import { listOrgMembersService } from '../../../services/organizations/members/listOrgMembersService'
import { createInspectionLog } from '../../../repositories/inspectionLog/inspectionLogRepository'
import { httpResponse, httpError } from '../../../utils/http'
import { StatusCode } from '../../../utils/statusCode'
import { GeneralErrorResponse } from '../../../errors/GeneralErrorResponse'
import { logger } from '../../../lib/logger'
const ctx = 'listOrgMembersController'

export async function listOrgMembersController(
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
    const members = await listOrgMembersService({
      orgId:            params.orgId,
      requestingUserId: request.user.sub,
    })

    await createInspectionLog({
      correlationId: request.user.sub,
      context:       ctx,
      direction:     'SERVER_TO_CLIENT',
      payload: [
        { title: 'DB - Membros listados', content: { count: members.length } },
        { title: 'Resposta', content: { statusCode: StatusCode.OK } },
      ],
    }).catch((err) => logger.error({ err }, `${ctx}: inspectionLog SERVER_TO_CLIENT write failed`))

    httpResponse({ reply, statusCode: StatusCode.OK, data: members, context: ctx })
  } catch (error) {
    await createInspectionLog({
      correlationId: request.user.sub,
      context:       ctx,
      direction:     'SERVER_TO_CLIENT',
      payload: [
        {
          title:   'Erro - Listar membros',
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

