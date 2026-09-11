// src/controllers/resources/materials/pdf/materialPdfSummaryController.ts
import type { FastifyRequest, FastifyReply } from 'fastify'
import { materialPdfSummaryService } from '../../../../services/resources/materials/pdf/materialPdfSummaryService'
import { createInspectionLog } from '../../../../repositories/inspectionLog/inspectionLogRepository'
import { httpResponse, httpError } from '../../../../utils/http'
import { StatusCode } from '../../../../utils/statusCode'
import { GeneralErrorResponse } from '../../../../errors/GeneralErrorResponse'
import { logger } from '../../../../lib/logger'

const ctx = 'materialPdfSummaryController'

/**
 * GET /mis/:id/summary
 * Retorna o resumo por IA de um MI aprovado e vetorizado.
 * Na primeira visita gera e persiste o resumo; nas seguintes devolve o cache.
 * Permissão: qualquer usuário autenticado (herda o acesso ao material aprovado).
 * Middlewares: [authenticate]
 */
export async function materialPdfSummaryController(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  logger.info(`IN - ${ctx}`)

  const { id } = request.params as { id: string }

  await createInspectionLog({
    correlationId: request.user.sub,
    context:       ctx,
    tag:           'AI_RAG',
    direction:     'CLIENT_TO_SERVER',
    payload: [
      {
        title:   'Request Payload',
        content: { method: request.method, url: request.url, materialId: id },
      },
    ],
  }).catch((err) => logger.error({ err }, `${ctx}: inspectionLog CLIENT_TO_SERVER write failed`))

  try {
    const result = await materialPdfSummaryService({
      materialId: id,
      userId:     request.user.sub,
    })

    await createInspectionLog({
      correlationId: request.user.sub,
      context:       ctx,
      direction:     'SERVER_TO_CLIENT',
      payload: [
        {
          title:   'Resumo por IA',
          content: { materialId: id, status: result.status, cached: result.generatedAt !== null },
        },
      ],
    }).catch((err) => logger.error({ err }, `${ctx}: inspectionLog SERVER_TO_CLIENT write failed`))

    httpResponse({ reply, statusCode: StatusCode.OK, data: result, context: ctx })
  } catch (error) {
    await createInspectionLog({
      correlationId: request.user.sub,
      context:       ctx,
      direction:     'SERVER_TO_CLIENT',
      payload: [
        {
          title:   'Erro - Resumo por IA',
          content: {
            materialId: id,
            message:    error instanceof Error ? error.message : String(error),
            code:       error instanceof GeneralErrorResponse ? error.code : 'INTERNAL_ERROR',
          },
        },
      ],
    }).catch((err) => logger.error({ err }, `${ctx}: inspectionLog ERROR write failed`))

    httpError({ error, context: ctx })
  }
}
