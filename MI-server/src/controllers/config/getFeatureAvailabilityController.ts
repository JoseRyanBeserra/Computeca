// src/controllers/config/getFeatureAvailabilityController.ts
import type { FastifyRequest, FastifyReply } from 'fastify'
import { getFeatureAvailabilityService } from '../../services/config/getFeatureAvailabilityService'
import { createInspectionLog } from '../../repositories/inspectionLog/inspectionLogRepository'
import { httpResponse, httpError } from '../../utils/http'
import { StatusCode } from '../../utils/statusCode'
import { logger } from '../../lib/logger'

const ctx = 'getFeatureAvailabilityController'

/**
 * GET /config/features
 *
 * Informa quais módulos estão disponíveis nesta instalação.
 *
 * Middlewares: nenhum — rota PÚBLICA por decisão consciente. O front precisa do
 * estado antes do login, porque visitante não logado também não pode ver
 * vestígio de funcionalidades desativadas. A resposta não expõe nada sensível:
 * apenas se um módulo está ligado, o que a própria interface já revelaria.
 */
export async function getFeatureAvailabilityController(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  logger.info(`IN - ${ctx}`)

  // Rota pública: não há `request.user` para correlacionar.
  await createInspectionLog({
    correlationId: undefined,
    context:       ctx,
    direction:     'CLIENT_TO_SERVER',
    payload:       [{ title: 'Consulta de disponibilidade de módulos', content: {} }],
  }).catch((err) => logger.error({ err }, `${ctx}: inspectionLog CLIENT_TO_SERVER write failed`))

  try {
    const result = await getFeatureAvailabilityService()

    await createInspectionLog({
      correlationId: undefined,
      context:       ctx,
      direction:     'SERVER_TO_CLIENT',
      payload:       [{ title: 'Disponibilidade resolvida', content: result }],
    }).catch((err) => logger.error({ err }, `${ctx}: inspectionLog SERVER_TO_CLIENT write failed`))

    httpResponse({ reply, statusCode: StatusCode.OK, data: result, context: ctx })
  } catch (error) {
    await createInspectionLog({
      correlationId: undefined,
      context:       ctx,
      direction:     'SERVER_TO_CLIENT',
      payload:       [{
        title:   'Erro - disponibilidade de módulos',
        content: { message: (error as Error).message },
      }],
    }).catch((err) => logger.error({ err }, `${ctx}: inspectionLog ERROR write failed`))

    httpError({ error, context: ctx })
  }
}
