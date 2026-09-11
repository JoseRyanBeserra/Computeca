// src/controllers/organizations/createOrganizationController.ts
import type { FastifyRequest, FastifyReply } from 'fastify'
import { createOrganizationService } from '../../services/organizations/createOrganizationService'
import { createInspectionLog } from '../../repositories/inspectionLog/inspectionLogRepository'
import { authorizeByRole } from '../../utils/authorizeByRole'
import { PROFESSOR, ADMIN } from '../../constants/roles'
import { httpResponse, httpError } from '../../utils/http'
import { StatusCode } from '../../utils/statusCode'
import { GeneralErrorResponse } from '../../errors/GeneralErrorResponse'
import { logger } from '../../lib/logger'
import type { CreateOrganizationRequest } from '../../schemas/organizations/createOrganizationSchema'
const ctx = 'createOrganizationController'

/**
 * POST /organizations
 *
 * Cria uma nova organização. Exclusivo para PROFESSOR e ADMIN.
 *
 * Middlewares: [authenticate]
 */
export async function createOrganizationController(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  logger.info(`IN - ${ctx}`)

  const body = request.body as CreateOrganizationRequest

  await createInspectionLog({
    correlationId: request.user.sub,
    context:       ctx,
    direction:     'CLIENT_TO_SERVER',
    payload: [
      {
        title:   'Request Payload',
        content: {
          method: request.method,
          url:    request.url,
          body:   { name: body.name, description: body.description },
        },
      },
    ],
  }).catch((err) => logger.error({ err }, `${ctx}: inspectionLog CLIENT_TO_SERVER write failed`))

  try {
    authorizeByRole(request.user.role, [PROFESSOR, ADMIN])

    const org = await createOrganizationService({
      name:        body.name,
      description: body.description,
      createdById: request.user.sub, // ID do usuário autenticado que está criando a organização
    })

    await createInspectionLog({
      correlationId: request.user.sub,
      context:       ctx,
      direction:     'SERVER_TO_CLIENT',
      payload: [
        {
          title:   'DB - Organização criada',
          content: { id: org.id, name: org.name },
        },
        {
          title:   'Resposta',
          content: { statusCode: StatusCode.CREATED },
        },
      ],
    }).catch((err) => logger.error({ err }, `${ctx}: inspectionLog SERVER_TO_CLIENT write failed`))

    httpResponse({ reply, statusCode: StatusCode.CREATED, data: org, context: ctx })
  } catch (error) {
    await createInspectionLog({
      correlationId: request.user.sub,
      context:       ctx,
      direction:     'SERVER_TO_CLIENT',
      payload: [
        {
          title:   'Erro - Criação de organização',
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
