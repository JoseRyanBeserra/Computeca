// src/controllers/users/listUsersController.ts
import type { FastifyRequest, FastifyReply } from 'fastify'
import { listUsersService } from '../../services/users/listUsersService'
import { authorizeByRole } from '../../utils/authorizeByRole'
import { ADMIN } from '../../constants/roles'
import { httpResponse, httpError } from '../../utils/http'
import { StatusCode } from '../../utils/statusCode'
import { logger } from '../../lib/logger'

const ctx = 'listUsersController'

/**
 * GET /users
 *
 * Lista usuários com filtros opcionais. Exclusivo para ADMIN.
 * Query params: role?, suspended?, page?, perPage?
 *
 * Middlewares: [authenticate]
 */
export async function listUsersController(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  logger.info(`IN - ${ctx}`)

  try {
    authorizeByRole(request.user.role, [ADMIN])

    const result = await listUsersService(request.query)

    httpResponse({ reply, statusCode: StatusCode.OK, data: result, context: ctx })
  } catch (error) {
    httpError({ error, context: ctx })
  }
}
