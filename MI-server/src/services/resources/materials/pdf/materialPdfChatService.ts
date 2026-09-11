// src/services/resources/materials/pdf/materialPdfChatService.ts
import { validateRequest } from '../../../../utils/validateRequest'
import { materialPdfChatSchema } from '../../../../schemas/resources/materials/pdf/materialPdfChatSchema'
import { findMaterialForChat } from '../../../../repositories/resources/materials/pdf/materialPdfChatRepository'
import { createInspectionLog } from '../../../../repositories/inspectionLog/inspectionLogRepository'
import { getQdrant, QDRANT_COLLECTION } from '../../../../lib/qdrant'
import { openai } from '../../../../lib/openai'
import { ERRORS, buildError } from '../../../../lib/errors/errors'
import { GeneralErrorResponse } from '../../../../errors/GeneralErrorResponse'
import { StatusCode } from '../../../../utils/statusCode'
import { logger } from '../../../../lib/logger'
import { withSpan, withSpanSync } from '../../../../lib/tracing'
import type { Span } from '@opentelemetry/api'
import type { IMaterialChatResponse, ITokenUsage } from '../../../../@types/resources/materials/pdf'
import type { MaterialForChat } from '../../../../repositories/resources/materials/pdf/materialPdfChatRepository'

// ── Configurações ─────────────────────────────────────────────────────────────

const TOP_K       = 5
const MIN_SCORE   = 0.3
const EMBED_MODEL = 'text-embedding-3-small'
const CHAT_MODEL  = 'gpt-4o-mini'
const MAX_TOKENS  = 1024
const SVC_CTX     = 'materialPdfChatService'

const SYSTEM_PROMPT = `Você é um assistente pedagógico especializado em materiais instrucionais acadêmicos.
Responda SEMPRE em português brasileiro com base EXCLUSIVAMENTE no contexto fornecido abaixo.
Se a resposta não estiver no contexto, informe educadamente que não encontrou essa informação no documento.
Seja claro, objetivo e didático.`

// ── GuardRail — Camada 1: Detecção de Prompt Injection ───────────────────────
// Padrões que indicam tentativa de sobrescrever o system prompt ou manipular a IA.

const INJECTION_PATTERNS: RegExp[] = [
  // Ignorar instruções (pt-BR)
  /ignore\s+(as\s+)?(instru[cç][oõ]es|prompts?|regras|contexto)/i,
  /esque[cç]a\s+(tudo|todas?\s+as?\s+instru[cç][oõ]es|o\s+contexto)/i,
  /desconsider[ae]\s+(as\s+)?(instru[cç][oõ]es|contexto)/i,
  // Reprogramar o assistente (pt-BR)
  /voc[eê]\s+(agora\s+[eé]|[eé]\s+agora|deve\s+ser|passou\s+a\s+ser)/i,
  /novo\s+(prompt|papel|pap[eé]l|sistema|system)/i,
  /a\s+partir\s+de\s+agora\s+voc[eê]/i,
  // Ignorar instruções (en)
  /ignore\s+(previous|all|prior|the\s+above|your)\s+(instructions?|prompts?|rules?|context)/i,
  /forget\s+(everything|all|previous|what|the)/i,
  /disregard\s+(previous|all|the)/i,
  /override\s+(your\s+)?(instructions?|programming|training)/i,
  // Mudança de persona (en)
  /you\s+are\s+now\s+(a|an|the)/i,
  /act\s+as\s+(if|a|an|the)/i,
  /pretend\s+(you\s+are|to\s+be)/i,
  /your\s+new\s+(instructions?|role|persona|task)/i,
  // Jailbreaks conhecidos
  /\bjailbreak\b/i,
  /\bDAN\b/,
  /do\s+anything\s+now/i,
  // Marcadores de sistema injetados
  /\[SYSTEM\]/i,
  /\[INST\]/i,
  /<\|im_start\|>/i,
  /###\s*(instruction|system|prompt)/i,
  /^system:/im,
]

// ── Tipos auxiliares ──────────────────────────────────────────────────────────

interface QdrantScoredPoint {
  score:    number
  payload?: Record<string, unknown>
}

interface EmbedResult {
  vector:          number[]
  embeddingTokens: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function detectPromptInjection(question: string): string | null {
  return withSpanSync('mi.chat.guardrail_injection', { 'busca.pergunta_tamanho': question.length }, (span) => {
    for (const pattern of INJECTION_PATTERNS) {
      if (pattern.test(question)) {
        span.setAttribute('guardrail.bloqueado', true)
        return pattern.source
      }
    }
    span.setAttribute('guardrail.bloqueado', false)
    return null
  })
}

async function moderateContent(question: string): Promise<string[]> {
  return withSpan('mi.chat.guardrail_moderacao', { 'busca.pergunta_tamanho': question.length }, async (span) => {
    const response = await openai.moderations.create({ input: question })
    const result   = response.results[0]

    if (!result.flagged) {
      span.setAttribute('guardrail.bloqueado', false)
      return []
    }

    const categorias = Object.entries(result.categories)
      .filter(([, flagged]) => flagged)
      .map(([category]) => category)

    span.setAttribute('guardrail.bloqueado', true)
    span.setAttribute('guardrail.categorias', categorias.join(','))
    return categorias
  })
}

async function fetchAndValidateMaterial(materialId: string): Promise<MaterialForChat> {
  const material = await findMaterialForChat(materialId)

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

async function embedQuestion(question: string): Promise<EmbedResult> {
  return withSpan(
    'mi.chat.embedding_pergunta',
    { 'ia.modelo': EMBED_MODEL, 'busca.pergunta_tamanho': question.length },
    async (span) => {
      const response = await openai.embeddings.create({
        model: EMBED_MODEL,
        input: question,
      })

      // Tokens consumidos por operação — base para o controle de custo de IA.
      span.setAttribute('ia.tokens_embedding', response.usage.prompt_tokens)

      return {
        vector:          response.data[0].embedding,
        embeddingTokens: response.usage.prompt_tokens,
      }
    },
  )
}

async function searchRelevantChunks(
  materialId: string,
  queryVector: number[],
): Promise<QdrantScoredPoint[]> {
  return withSpan(
    'mi.chat.busca_semantica',
    { 'mi.id': materialId, 'busca.top_k': TOP_K, 'busca.score_minimo': MIN_SCORE },
    async (span) => {
      const qdrant = await getQdrant()
      const results = await qdrant.search(QDRANT_COLLECTION, {
        vector:       queryVector,
        limit:        TOP_K,
        filter:       { must: [{ key: 'materialId', match: { value: materialId } }] },
        with_payload: true,
      })

      span.setAttribute('busca.total_encontrado', results.length)
      if (results.length > 0) {
        span.setAttribute('busca.melhor_score', results[0].score)
      }

      return results
    },
  )
}

function extractValidChunks(results: QdrantScoredPoint[]): string[] {
  return results
    .filter(r => r.score > MIN_SCORE)
    .map(r => String(r.payload?.text ?? ''))
    .filter(t => t.length > 0)
}

// ── Service ───────────────────────────────────────────────────────────────────

export async function materialPdfChatService(input: unknown): Promise<IMaterialChatResponse> {
  logger.info('IN - materialPdfChatService')

  const { materialId, question, userId } = validateRequest(input, materialPdfChatSchema)

  return withSpan(
    'mi.chat.rag',
    {
      'mi.id':                  materialId,
      'usuario.id':             userId,
      'busca.pergunta_tamanho': question.length,
    },
    async (spanRag) => runChat({ materialId, question, userId }, spanRag),
  )
}

/** Corpo do fluxo RAG — separado para que `materialPdfChatService` abra o span raiz. */
async function runChat(
  { materialId, question, userId }: { materialId: string; question: string; userId: string },
  spanRag: Span,
): Promise<IMaterialChatResponse> {

  // ── GuardRail 1: Prompt Injection ─────────────────────────────────────────
  const matchedPattern = detectPromptInjection(question)

  if (matchedPattern !== null) {
    await createInspectionLog({
      correlationId: userId,
      context:       SVC_CTX,
      direction:     'SERVER_TO_CLIENT',
      tag:           'AI_RAG',
      payload: [
        {
          title:   'GuardRail - Prompt Injection bloqueado',
          content: { materialId, matchedPattern, questionLength: question.length },
        },
      ],
    }).catch((err) => logger.error({ err }, `${SVC_CTX}: inspectionLog injection-blocked write failed`))

    throw new GeneralErrorResponse(StatusCode.BAD_REQUEST, buildError(ERRORS.CHAT.CHAT_PROMPT_INJECTION))
  }

  // ── GuardRail 2: Moderação de conteúdo (OpenAI) ───────────────────────────
  const flaggedCategories = await moderateContent(question)

  if (flaggedCategories.length > 0) {
    await createInspectionLog({
      correlationId: userId,
      context:       SVC_CTX,
      direction:     'SERVER_TO_CLIENT',
      tag:           'AI_RAG',
      payload: [
        {
          title:   'GuardRail - Conteúdo bloqueado pela moderação',
          content: { materialId, flaggedCategories, questionLength: question.length },
        },
      ],
    }).catch((err) => logger.error({ err }, `${SVC_CTX}: inspectionLog content-flagged write failed`))

    throw new GeneralErrorResponse(StatusCode.BAD_REQUEST, buildError(ERRORS.CHAT.CHAT_CONTENT_FLAGGED))
  }

  // ── 1. Valida material ────────────────────────────────────────────────────
  const material = await fetchAndValidateMaterial(materialId)

  await createInspectionLog({
    correlationId: userId,
    context:       SVC_CTX,
    direction:     'SERVER_TO_CLIENT',
    tag:           'AI_RAG',
    payload: [
      {
        title:   'Material validado para chat',
        content: { materialId, status: material.status, vectorStatus: material.vectorStatus },
      },
    ],
  }).catch((err) => logger.error({ err }, `${SVC_CTX}: inspectionLog material-validated write failed`))

  // ── 2. Embedding da pergunta ──────────────────────────────────────────────
  const { vector: queryVector, embeddingTokens } = await embedQuestion(question)

  await createInspectionLog({
    correlationId: userId,
    context:       SVC_CTX,
    direction:     'SERVER_TO_CLIENT',
    tag:           'AI_RAG',
    payload: [
      {
        title:   'OpenAI - Embedding da pergunta',
        content: { model: EMBED_MODEL, embeddingTokens, questionLength: question.length },
      },
    ],
  }).catch((err) => logger.error({ err }, `${SVC_CTX}: inspectionLog embedding write failed`))

  // ── 3. Busca semântica no Qdrant ──────────────────────────────────────────
  const results = await searchRelevantChunks(materialId, queryVector)
  const chunks  = extractValidChunks(results)

  spanRag.setAttribute('busca.trechos_usados', chunks.length)

  await createInspectionLog({
    correlationId: userId,
    context:       SVC_CTX,
    direction:     'SERVER_TO_CLIENT',
    tag:           'AI_RAG',
    payload: [
      {
        title:   'Qdrant - Busca semântica',
        content: {
          materialId,
          topK:              TOP_K,
          minScore:          MIN_SCORE,
          totalFound:        results.length,
          chunksAfterFilter: chunks.length,
          scores:            results.map(r => r.score),
        },
      },
    ],
  }).catch((err) => logger.error({ err }, `${SVC_CTX}: inspectionLog qdrant-search write failed`))

  if (chunks.length === 0) {
    await createInspectionLog({
      correlationId: userId,
      context:       SVC_CTX,
      direction:     'SERVER_TO_CLIENT',
      tag:           'AI_RAG',
      payload: [
        {
          title:   'Resposta - Sem trechos relevantes',
          content: { materialId, embeddingTokens, promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        },
      ],
    }).catch((err) => logger.error({ err }, `${SVC_CTX}: inspectionLog no-chunks write failed`))

    logger.info({ materialId }, 'OUT - materialPdfChatService: no relevant chunks found')
    spanRag.setAttribute('busca.sem_resultado', true)
    return {
      answer:     'Não encontrei trechos relevantes no documento para responder a sua pergunta. Tente reformular ou faça uma pergunta diferente.',
      chunksUsed: 0,
      tokenUsage: { embeddingTokens, promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    }
  }

  // ── 4. Geração da resposta com o modelo de chat ───────────────────────────
  const context    = chunks.map((c, i) => `[Trecho ${i + 1}]\n${c}`).join('\n\n')
  const completion = await withSpan(
    'mi.chat.geracao_resposta',
    { 'ia.modelo': CHAT_MODEL, 'busca.trechos_usados': chunks.length, 'ia.max_tokens': MAX_TOKENS },
    async (span) => {
      const result = await openai.chat.completions.create({
        model:      CHAT_MODEL,
        max_tokens: MAX_TOKENS,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user',   content: `Contexto do documento:\n\n${context}\n\n---\n\nPergunta: ${question}` },
        ],
      })

      span.setAttribute('ia.tokens_prompt',     result.usage?.prompt_tokens     ?? 0)
      span.setAttribute('ia.tokens_completion', result.usage?.completion_tokens ?? 0)
      span.setAttribute('ia.tokens_total',      result.usage?.total_tokens      ?? 0)

      return result
    },
  )

  const answer: string = completion.choices[0]?.message?.content?.trim() ?? ''

  const tokenUsage: ITokenUsage = {
    embeddingTokens,
    promptTokens:     completion.usage?.prompt_tokens     ?? 0,
    completionTokens: completion.usage?.completion_tokens ?? 0,
    totalTokens:      completion.usage?.total_tokens      ?? 0,
  }

  await createInspectionLog({
    correlationId: userId,
    context:       SVC_CTX,
    direction:     'SERVER_TO_CLIENT',
    tag:           'AI_RAG',
    payload: [
      {
        title:   'OpenAI - Geração de resposta',
        content: {
          model:            CHAT_MODEL,
          chunksUsed:       chunks.length,
          embeddingTokens:  tokenUsage.embeddingTokens,
          promptTokens:     tokenUsage.promptTokens,
          completionTokens: tokenUsage.completionTokens,
          totalTokens:      tokenUsage.totalTokens,
        },
      },
    ],
  }).catch((err) => logger.error({ err }, `${SVC_CTX}: inspectionLog completion write failed`))

  logger.info({ materialId, chunksUsed: chunks.length, tokenUsage }, 'OUT - materialPdfChatService')

  // Evento de negócio estruturado — consumo de IA pesquisável no Loki por
  // usuário e por material, correlacionado ao trace pelo trace_id.
  logger.info(
    {
      evento:           'rag_respondido',
      mi_id:            materialId,
      usuario_id:       userId,
      ia_modelo:        CHAT_MODEL,
      chunks_usados:    chunks.length,
      tokens_prompt:    tokenUsage.promptTokens,
      tokens_resposta:  tokenUsage.completionTokens,
      tokens_total:     tokenUsage.totalTokens + tokenUsage.embeddingTokens,
    },
    'Busca semântica respondida',
  )

  spanRag.setAttribute('ia.tokens_total', tokenUsage.totalTokens + tokenUsage.embeddingTokens)

  return { answer, chunksUsed: chunks.length, tokenUsage }
}
