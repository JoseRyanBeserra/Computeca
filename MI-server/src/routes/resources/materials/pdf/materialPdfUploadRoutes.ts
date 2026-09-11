// src/routes/resources/materials/pdf/materialPdfUploadRoutes.ts
import type { FastifyInstance } from 'fastify'
import { authenticate } from '../../../../middlewares/authenticate'
import { requireUploadPermission } from '../../../../middlewares/requireUploadPermission'
import { materialPdfUploadController } from '../../../../controllers/resources/materials/pdf/materialPdfUploadController'
import { materialPdfListByUserController } from '../../../../controllers/resources/materials/pdf/materialPdfListByUserController'
import { materialPdfPresignedUrlController } from '../../../../controllers/resources/materials/pdf/materialPdfPresignedUrlController'
import { materialPdfPendingListController } from '../../../../controllers/resources/materials/pdf/materialPdfPendingListController'
import { materialPdfAllListController } from '../../../../controllers/resources/materials/pdf/materialPdfAllListController'
import { materialPdfPublicListController } from '../../../../controllers/resources/materials/pdf/materialPdfPublicListController'
import { materialPdfDetailController } from '../../../../controllers/resources/materials/pdf/materialPdfDetailController'
import { materialPdfHabilidadesListController } from '../../../../controllers/resources/materials/pdf/materialPdfHabilidadesListController'
import { materialPdfPublicPresignedUrlController } from '../../../../controllers/resources/materials/pdf/materialPdfPublicPresignedUrlController'
import { materialPdfReviewPresignedUrlController } from '../../../../controllers/resources/materials/pdf/materialPdfReviewPresignedUrlController'
import { materialPdfReviewController } from '../../../../controllers/resources/materials/pdf/materialPdfReviewController'
import { materialPdfChatController } from '../../../../controllers/resources/materials/pdf/materialPdfChatController'
import { materialPdfSummaryController } from '../../../../controllers/resources/materials/pdf/materialPdfSummaryController'
import { materialPdfDeleteController } from '../../../../controllers/resources/materials/pdf/materialPdfDeleteController'
import { env } from '../../../../env'

export async function materialPdfUploadRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async () => ({
    status: 'ok',
    module: 'mis',
    timestamp: new Date().toISOString(),
  }))

  /**
   * RF-MI01 — POST /mis
   * Upload de um Material Instrucional (PDF).
   *
   * Permissão: apenas usuários com canUpload = true.
   * Body   : multipart/form-data { file: File (PDF), title?: string }
   * Resposta: 201 + UploadedMIDTO
   */
  app.post(
    '/',
    {
      bodyLimit: env.MI_MAX_FILE_SIZE_MB * 1024 * 1024,
      preHandler: [authenticate, requireUploadPermission],
    },
    materialPdfUploadController,
  )

  /**
   * GET /mis/public
   * Lista materiais APPROVED — todos os usuários autenticados.
   */
  app.get(
    '/public',
    { preHandler: [authenticate] },
    materialPdfPublicListController,
  )

  /**
   * GET /mis/habilidades
   * Lista as habilidades BNCC distintas dos materiais aprovados (para o filtro).
   */
  app.get(
    '/habilidades',
    { preHandler: [authenticate] },
    materialPdfHabilidadesListController,
  )

  /**
   * GET /mis/:id/public-presigned-url
   * URL pré-assinada para material APPROVED — todos os usuários autenticados.
   */
  app.get(
    '/:id/public-presigned-url',
    { preHandler: [authenticate] },
    materialPdfPublicPresignedUrlController,
  )

  /**
   * GET /mis/all
   * Lista todos os materiais da plataforma (PROFESSOR, ADMIN). Filtro por status.
   */
  app.get(
    '/all',
    { preHandler: [authenticate] },
    materialPdfAllListController,
  )

  /**
   * RF-MI03 — GET /mis/pending
   * Lista materiais pendentes de revisão (PROFESSOR, ADMIN).
   */
  app.get(
    '/pending',
    { preHandler: [authenticate] },
    materialPdfPendingListController,
  )

  /**
   * RF-MI02 — GET /mis/me
   * Lista todos os materiais instrucionais enviados pelo usuário autenticado.
   *
   * Permissão: INSTITUTIONALIZED, PROFESSOR, ADMIN.
   * Resposta : 200 + UploadedMIDTO[]  (ordem: mais recente primeiro)
   */
  app.get(
    '/me',
    { preHandler: [authenticate] },
    materialPdfListByUserController,
  )

  /**
   * RF-MI05 — GET /mis/:id/review-presigned-url
   * URL pré-assinada para professor visualizar qualquer PDF (sem verificação de dono).
   */
  app.get(
    '/:id/review-presigned-url',
    { preHandler: [authenticate] },
    materialPdfReviewPresignedUrlController,
  )

  /**
   * RF-MI06 — PATCH /mis/:id/review
   * Aprova ou rejeita um material pendente. Body: { decision: 'APPROVED' | 'REJECTED' }
   */
  app.patch(
    '/:id/review',
    { preHandler: [authenticate] },
    materialPdfReviewController,
  )

  /**
   * RF-MI04 — GET /mis/:id/presigned-url
   * Gera URL temporária (1h) para visualização direta do PDF no MinIO.
   *
   * Permissão: INSTITUTIONALIZED, PROFESSOR, ADMIN — apenas dono do material.
   * Resposta : 200 + MaterialPresignedUrlDTO
   */
  app.get(
    '/:id/presigned-url',
    { preHandler: [authenticate] },
    materialPdfPresignedUrlController,
  )

  /**
   * GET /mis/:id
   * Detalhe de um material específico (metadados + autor + habilidades BNCC).
   *
   * Acesso: APPROVED para qualquer autenticado; demais status apenas dono ou PROFESSOR/ADMIN.
   */
  app.get(
    '/:id',
    { preHandler: [authenticate] },
    materialPdfDetailController,
  )

  /**
   * POST /mis/:id/chat
   * Pergunta via RAG sobre o conteúdo de um MI aprovado e vetorizado.
   * Body: { question: string }
   * Resposta: { answer: string, chunksUsed: number }
   * Permissão: qualquer usuário autenticado.
   */
  app.post(
    '/:id/chat',
    { preHandler: [authenticate] },
    materialPdfChatController,
  )

  /**
   * DELETE /mis/:id
   * Soft delete de um material — oculta das listagens/visualização (PROFESSOR, ADMIN).
   */
  app.delete(
    '/:id',
    { preHandler: [authenticate] },
    materialPdfDeleteController,
  )

  /**
   * GET /mis/:id/summary
   * Resumo por IA de um MI aprovado e vetorizado. Gera na primeira visita e
   * devolve o cache persistido nas visitas seguintes (qualquer usuário).
   * Resposta: { status: 'DONE' | 'PROCESSING', summary: string | null, generatedAt: string | null }
   * Permissão: qualquer usuário autenticado.
   */
  app.get(
    '/:id/summary',
    { preHandler: [authenticate] },
    materialPdfSummaryController,
  )
}
