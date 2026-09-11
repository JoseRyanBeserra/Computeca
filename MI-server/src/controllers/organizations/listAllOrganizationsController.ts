// src/controllers/organizations/listAllOrganizationsController.ts
import type { FastifyRequest, FastifyReply } from 'fastify'
import { listAllOrganizationsService } from '../../services/organizations/listAllOrganizationsService'
import { authorizeByRole } from '../../utils/authorizeByRole'
import { ADMIN } from '../../constants/roles'
import { httpResponse, httpError } from '../../utils/http'
import { StatusCode } from '../../utils/statusCode'
import { logger } from '../../lib/logger'

const ctx = 'listAllOrganizationsController'

/**
 * GET /organizations/all
 *
 * Lista todas as organizações da plataforma. Exclusivo para ADMIN.
 * Query params: status?, page?, perPage?
 *
 * Middlewares: [authenticate]
 */
export async function listAllOrganizationsController(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  logger.info(`IN - ${ctx}`)

  try {
    authorizeByRole(request.user.role, [ADMIN])

    const result = await listAllOrganizationsService(request.query)

    httpResponse({ reply, statusCode: StatusCode.OK, data: result, context: ctx })
  } catch (error) {
    httpError({ error, context: ctx })
  }
}
