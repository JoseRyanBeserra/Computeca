// src/controllers/resources/materials/pdf/materialPdfChatController.ts
import type { FastifyRequest, FastifyReply } from 'fastify'
import { materialPdfChatService } from '../../../../services/resources/materials/pdf/materialPdfChatService'
import { createInspectionLog } from '../../../../repositories/inspectionLog/inspectionLogRepository'
import { httpResponse, httpError } from '../../../../utils/http'
import { StatusCode } from '../../../../utils/statusCode'
import { GeneralErrorResponse } from '../../../../errors/GeneralErrorResponse'
import { authorizeByRole } from '../../../../utils/authorizeByRole'
import { INSTITUTIONALIZED, PROFESSOR, ADMIN } from '../../../../constants/roles'
import { logger } from '../../../../lib/logger'
import type { MaterialPdfChatRequest } from '../../../../schemas/resources/materials/pdf/materialPdfChatSchema'

const CHAT_AI_ROLES = [INSTITUTIONALIZED, PROFESSOR, ADMIN] as const

const ctx = 'materialPdfChatController'

/**
 * POST /mis/:id/chat
 * Envia uma pergunta sobre o conteúdo de um MI aprovado e vetorizado.
 * Resposta gerada via RAG: Qdrant (busca semântica) + OpenAI (geração).
 * Permissão: INSTITUTIONALIZED, PROFESSOR, ADMIN (usuários @dcx.ufpb.br ou superiores).
 * Middlewares: [authenticate]
 */
export async function materialPdfChatController(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  logger.info(`IN - ${ctx}`)

  const { id }       = request.params as { id: string }
  const { question } = request.body as MaterialPdfChatRequest

  await createInspectionLog({
    correlationId: request.user.sub,
    context:       ctx,
    tag:           'AI_RAG',
    direction:     'CLIENT_TO_SERVER',
    payload: [
      {
        title:   'Request Payload',
        content: {
          method:     request.method,
          url:        request.url,
          materialId: id,
          question,
        },
      },
    ],
  }).catch((err) => logger.error({ err }, `${ctx}: inspectionLog CLIENT_TO_SERVER write failed`))

  try {
    authorizeByRole(request.user.role, CHAT_AI_ROLES)

    const result = await materialPdfChatService({
      materialId: id,
      question,
      userId: request.user.sub,
    })

    await createInspectionLog({
      correlationId: request.user.sub,
      context:       ctx,
      direction:     'SERVER_TO_CLIENT',
      payload: [
        {
          title:   'RAG - Busca semântica',
          content: { materialId: id, chunksUsed: result.chunksUsed },
        },
        {
          title:   'Resumo de tokens (embedding + chat)',
          content: {
            embeddingTokens:  result.tokenUsage.embeddingTokens,
            promptTokens:     result.tokenUsage.promptTokens,
            completionTokens: result.tokenUsage.completionTokens,
            totalTokens:      result.tokenUsage.totalTokens,
          },
        },
        {
          title:   'Resposta',
          content: { statusCode: StatusCode.OK },
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
          title:   'Erro - Chat RAG',
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
