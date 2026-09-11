// src/routes/logs/logsRoutes.ts
import type { FastifyInstance } from 'fastify'
import { authenticate } from '../../middlewares/authenticate'
import { listInspectionLogsController } from '../../controllers/logs/listInspectionLogsController'

export async function logsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async () => ({
    status: 'ok',
    module: 'logs',
    timestamp: new Date().toISOString(),
  }))

  /**
   * GET /logs
   * Lista InspectionLogs com filtros. Exclusivo para ADMIN.
   */
  app.get(
    '/',
    { preHandler: [authenticate] },
    listInspectionLogsController,
  )
}
