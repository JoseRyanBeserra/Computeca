// src/services/resources/materials/pdf/materialPdfSummaryService.ts
import { validateRequest } from '../../../../utils/validateRequest'
import { materialPdfSummarySchema } from '../../../../schemas/resources/materials/pdf/materialPdfSummarySchema'
import {
  findMaterialForSummary,
  claimSummaryGeneration,
  saveSummary,
  markSummaryFailed,
  type MaterialForSummary,
} from '../../../../repositories/resources/materials/pdf/materialPdfSummaryRepository'
import { createInspectionLog } from '../../../../repositories/inspectionLog/inspectionLogRepository'
import { getQdrant, QDRANT_COLLECTION } from '../../../../lib/qdrant'
import { openai } from '../../../../lib/openai'
import { ERRORS, buildError } from '../../../../lib/errors/errors'
import { GeneralErrorResponse } from '../../../../errors/GeneralErrorResponse'
import { StatusCode } from '../../../../utils/statusCode'
import { logger } from '../../../../lib/logger'
import { withSpan } from '../../../../lib/tracing'
import type { Span } from '@opentelemetry/api'
import type { IMaterialSummaryResponse } from '../../../../@types/resources/materials/pdf'

// ── Configurações ─────────────────────────────────────────────────────────────

const CHAT_MODEL       = 'gpt-4o-mini'
const MAX_TOKENS       = 700    // resumo enxuto — poucos parágrafos
const SCROLL_PAGE_SIZE = 250    // chunks lidos por página no Qdrant
const MAX_INPUT_CHARS  = 24000  // ~6k tokens de contexto — teto de custo por resumo
const SVC_CTX          = 'materialPdfSummaryService'

const SYSTEM_PROMPT = `Você é um assistente pedagógico especializado em materiais instrucionais acadêmicos.
Gere um RESUMO objetivo e didático do material a seguir, em português brasileiro.
Baseie-se EXCLUSIVAMENTE no conteúdo fornecido — não invente informações.
Estruture em 2 a 4 parágrafos curtos, destacando o tema central, os principais tópicos abordados e a finalidade pedagógica do material.
Não use saudações nem se refira a si mesmo; escreva apenas o resumo.`

// ── Tipos auxiliares ──────────────────────────────────────────────────────────

interface DocumentChunk {
  chunkIndex: number
  text:       string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Lê todos os chunks vetorizados do material no Qdrant (paginando via scroll) e
 * os devolve em ordem do documento (`chunkIndex`). Reaproveita o texto já
 * processado na vetorização — sem re-baixar/re-parsear o PDF.
 */
async function fetchDocumentChunks(materialId: string): Promise<DocumentChunk[]> {
  return withSpan(
    'mi.resumo.buscar_chunks',
    { 'mi.id': materialId, 'busca.page_size': SCROLL_PAGE_SIZE },
    async (span) => {
      const qdrant = await getQdrant()
      const collected: DocumentChunk[] = []
      let offset: string | number | null = null

      do {
        const page = await qdrant.scroll(QDRANT_COLLECTION, {
          filter:       { must: [{ key: 'materialId', match: { value: materialId } }] },
          limit:        SCROLL_PAGE_SIZE,
          ...(offset !== null ? { offset } : {}),
          with_payload: true,
          with_vector:  false,
        })

        for (const point of page.points) {
          const text = String(point.payload?.text ?? '')
          if (text.length > 0) {
            collected.push({ chunkIndex: Number(point.payload?.chunkIndex ?? 0), text })
          }
        }

        offset = page.next_page_offset ?? null
      } while (offset !== null)

      collected.sort((a, b) => a.chunkIndex - b.chunkIndex)
      span.setAttribute('busca.total_chunks', collected.length)
      return collected
    },
  )
}

/** Concatena os chunks em ordem, respeitando o teto de caracteres de entrada. */
function buildDocumentText(chunks: DocumentChunk[]): string {
  let text = ''
  for (const chunk of chunks) {
    if (text.length + chunk.text.length > MAX_INPUT_CHARS) {
      text += chunk.text.slice(0, MAX_INPUT_CHARS - text.length)
      break
    }
    text += (text.length > 0 ? '\n' : '') + chunk.text
  }
  return text
}

async function fetchAndValidateMaterial(materialId: string): Promise<MaterialForSummary> {
  const material = await findMaterialForSummary(materialId)

  if (!material) {
    throw new GeneralErrorResponse(StatusCode.NOT_FOUND, buildError(ERRORS.ERRORS_RESOURCES.MI_NOT_FOUND))
  }
  if (material.status !== 'APPROVED') {
    throw new GeneralErrorResponse(StatusCode.BAD_REQUEST, buildError(ERRORS.ERRORS_RESOURCES.MI_NOT_APPROVED))
  }
  if (material.vectorStatus !== 'DONE') {
    throw new GeneralErrorResponse(StatusCode.BAD_REQUEST, buildError(ERRORS.ERRORS_RESOURCES.MI_NOT_VECTORIZED))
  }

  return material
}

/** Gera o resumo via modelo de chat e devolve o texto e os tokens consumidos. */
async function generateSummary(materialId: string, documentText: string): Promise<{ summary: string; totalTokens: number }> {
  return withSpan(
    'mi.resumo.geracao',
    { 'ia.modelo': CHAT_MODEL, 'ia.max_tokens': MAX_TOKENS, 'mi.caracteres_entrada': documentText.length },
    async (span) => {
      const completion = await openai.chat.completions.create({
        model:      CHAT_MODEL,
        max_tokens: MAX_TOKENS,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user',   content: `Conteúdo do material instrucional:\n\n${documentText}` },
        ],
      })

      span.setAttribute('ia.tokens_prompt',     completion.usage?.prompt_tokens     ?? 0)
      span.setAttribute('ia.tokens_completion', completion.usage?.completion_tokens ?? 0)
      span.setAttribute('ia.tokens_total',      completion.usage?.total_tokens      ?? 0)

      return {
        summary:     completion.choices[0]?.message?.content?.trim() ?? '',
        totalTokens: completion.usage?.total_tokens ?? 0,
      }
    },
  )
}

// ── Service ───────────────────────────────────────────────────────────────────

/**
 * Retorna o resumo por IA de um MI aprovado e vetorizado.
 *
 * Cache-first: se o resumo já existe (`summaryStatus = DONE`), devolve o valor
 * persistido sem chamar a IA. Na primeira visita, gera o resumo, persiste no
 * material e o devolve — cliques posteriores (de qualquer usuário) leem o cache.
 */
export async function materialPdfSummaryService(input: unknown): Promise<IMaterialSummaryResponse> {
  logger.info('IN - materialPdfSummaryService')

  const { materialId, userId } = validateRequest(input, materialPdfSummarySchema)

  return withSpan(
    'mi.resumo.gerar',
    { 'mi.id': materialId, 'usuario.id': userId },
    async (span) => runSummary({ materialId, userId }, span),
  )
}

async function runSummary(
  { materialId, userId }: { materialId: string; userId: string },
  span: Span,
): Promise<IMaterialSummaryResponse> {
  // ── 1. Valida material (existe, aprovado e vetorizado) ────────────────────
  const material = await fetchAndValidateMaterial(materialId)

  // ── 2. Cache hit — resumo já gerado ───────────────────────────────────────
  if (material.summaryStatus === 'DONE' && material.summary) {
    span.setAttribute('mi.resumo.cache_hit', true)
    logger.info({ materialId }, 'OUT - materialPdfSummaryService: cache hit')
    return { status: 'DONE', summary: material.summary, generatedAt: material.summaryGeneratedAt }
  }

  span.setAttribute('mi.resumo.cache_hit', false)

  // ── 3. Reserva atômica da geração (evita geração duplicada) ───────────────
  const owns = await claimSummaryGeneration(materialId)

  if (!owns) {
    // Outra requisição está gerando. Re-lê o material: pode ter concluído no
    // meio-tempo; senão, sinaliza PROCESSING para o cliente tentar de novo.
    const fresh = await findMaterialForSummary(materialId)
    if (fresh?.summaryStatus === 'DONE' && fresh.summary) {
      return { status: 'DONE', summary: fresh.summary, generatedAt: fresh.summaryGeneratedAt }
    }
    span.setAttribute('mi.resumo.em_processamento', true)
    logger.info({ materialId }, 'OUT - materialPdfSummaryService: já em processamento')
    return { status: 'PROCESSING', summary: null, generatedAt: null }
  }

  // ── 4. Geração (esta requisição é a dona) ─────────────────────────────────
  try {
    const chunks       = await fetchDocumentChunks(materialId)
    const documentText = buildDocumentText(chunks)

    if (documentText.length === 0) {
      await markSummaryFailed(materialId)
      throw new GeneralErrorResponse(StatusCode.BAD_REQUEST, buildError(ERRORS.ERRORS_RESOURCES.MI_SUMMARY_EMPTY))
    }

    const { summary, totalTokens } = await generateSummary(materialId, documentText)
    const generatedAt = await saveSummary(materialId, summary)

    span.setAttribute('ia.tokens_total', totalTokens)

    await createInspectionLog({
      correlationId: userId,
      context:       SVC_CTX,
      direction:     'SERVER_TO_CLIENT',
      tag:           'AI_RAG',
      payload: [
        {
          title:   'OpenAI - Geração de resumo',
          content: { materialId, model: CHAT_MODEL, chunksUsed: chunks.length, totalTokens },
        },
      ],
    }).catch((err) => logger.error({ err }, `${SVC_CTX}: inspectionLog summary write failed`))

    // Evento de negócio estruturado — consumo de IA pesquisável no Loki.
    logger.info(
      {
        evento:        'mi_resumo_gerado',
        mi_id:         materialId,
        usuario_id:    userId,
        ia_modelo:     CHAT_MODEL,
        chunks_usados: chunks.length,
        tokens_total:  totalTokens,
      },
      'Resumo de Material Instrucional gerado',
    )

    logger.info({ materialId, chunksUsed: chunks.length, totalTokens }, 'OUT - materialPdfSummaryService')
    return { status: 'DONE', summary, generatedAt }
  } catch (err) {
    // Falha na geração: libera o material para nova tentativa (FAILED) e propaga.
    await markSummaryFailed(materialId)
    logger.error({ err, evento: 'falha_resumo', mi_id: materialId }, 'Falha ao gerar resumo do Material Instrucional')
    throw err
  }
}
