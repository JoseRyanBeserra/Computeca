// src/controllers/logs/listInspectionLogsController.ts
import type { FastifyRequest, FastifyReply } from 'fastify'
import { listInspectionLogsService } from '../../services/logs/listInspectionLogsService'
import { authorizeByRole } from '../../utils/authorizeByRole'
import { ADMIN } from '../../constants/roles'
import { httpResponse, httpError } from '../../utils/http'
import { StatusCode } from '../../utils/statusCode'
import { logger } from '../../lib/logger'

const ctx = 'listInspectionLogsController'

/**
 * GET /logs
 *
 * Lista InspectionLogs com filtros opcionais. Exclusivo para ADMIN.
 * Query params: level?, direction?, context?, requestId?, page?, perPage?
 *
 * Middlewares: [authenticate]
 */
export async function listInspectionLogsController(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  logger.info(`IN - ${ctx}`)

  try {
    authorizeByRole(request.user.role, [ADMIN])

    const result = await listInspectionLogsService(request.query)

    httpResponse({ reply, statusCode: StatusCode.OK, data: result, context: ctx })
  } catch (error) {
    httpError({ error, context: ctx })
  }
}
