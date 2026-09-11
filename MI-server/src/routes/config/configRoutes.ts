// src/routes/config/configRoutes.ts
import type { FastifyInstance } from 'fastify'
import { getFeatureAvailabilityController } from '../../controllers/config/getFeatureAvailabilityController'
import { updateAiAvailabilityController } from '../../controllers/config/updateAiAvailabilityController'
import { authenticate } from '../../middlewares/authenticate'

export async function configRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /config/features — disponibilidade dos módulos (PÚBLICA)
   *
   * Sem `authenticate` por decisão consciente: o front precisa saber o que
   * renderizar antes do login, já que visitante não logado também não pode ver
   * vestígio de funcionalidade desativada.
   */
  app.get('/features', getFeatureAvailabilityController)

  /** PATCH /config/features/ai — altera a disponibilidade da IA (ADMIN) */
  app.patch(
    '/features/ai',
    { preHandler: [authenticate] },
    updateAiAvailabilityController,
  )
}
