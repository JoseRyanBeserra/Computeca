// src/controllers/resources/materials/pdf/materialPdfHabilidadesListController.ts
import type { FastifyRequest, FastifyReply } from 'fastify'
import { materialPdfHabilidadesService } from '../../../../services/resources/materials/pdf/materialPdfHabilidadesService'
import { httpResponse, httpError } from '../../../../utils/http'
import { StatusCode } from '../../../../utils/statusCode'
import { logger } from '../../../../lib/logger'

const ctx = 'materialPdfHabilidadesListController'

/**
 * GET /mis/habilidades
 *
 * Lista as habilidades BNCC distintas presentes nos materiais aprovados,
 * para popular o filtro do acervo público.
 *
 * Middlewares: [authenticate]
 */
export async function materialPdfHabilidadesListController(
  _request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  logger.info(`IN - ${ctx}`)

  try {
    const result = await materialPdfHabilidadesService()
    httpResponse({ reply, statusCode: StatusCode.OK, data: result, context: ctx })
  } catch (error) {
    httpError({ error, context: ctx })
  }
}
