import 'dotenv/config'
import { Worker, type Job } from 'bullmq'
import OpenAI from 'openai'
import { randomUUID } from 'node:crypto'
import { minioClient, MINIO_BUCKET } from '../lib/minio'
import { getQdrant, QDRANT_COLLECTION, ensureQdrantCollection } from '../lib/qdrant'
import { prisma } from '../database/prisma'
import { env } from '../env'
import { logger } from '../lib/logger'
import { withSpan, withSpanSync } from '../lib/tracing'
import type { Span } from '@opentelemetry/api'
import type { VectorizePdfJob } from '../lib/queue'

// eslint-disable-next-line @typescript-eslint/no-require-imports
import pdfParse = require('pdf-parse')

const CHUNK_SIZE    = 1000
const CHUNK_OVERLAP = 200
const EMBED_BATCH   = 100

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY })

// ── Helpers ────────────────────────────────────────────────────────────────────

function chunkText(text: string): string[] {
  const chunks: string[] = []
  let start = 0
  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length)
    chunks.push(text.slice(start, end).trim())
    start += CHUNK_SIZE - CHUNK_OVERLAP
  }
  return chunks.filter(c => c.length > 50)
}

async function downloadPdfBuffer(storageKey: string): Promise<Buffer> {
  return withSpan('mi.vetorizacao.download_pdf', { 'mi.storage_key': storageKey }, async (span) => {
    const stream = await minioClient.getObject(MINIO_BUCKET, storageKey)
    const parts: Buffer[] = []
    for await (const chunk of stream) {
      parts.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }
    const buffer = Buffer.concat(parts)
    span.setAttribute('mi.tamanho_bytes', buffer.length)
    return buffer
  })
}

async function embedBatch(texts: string[]): Promise<number[][]> {
  return withSpan(
    'mi.vetorizacao.embedding_batch',
    { 'ia.modelo': 'text-embedding-3-small', 'mi.chunks_no_batch': texts.length },
    async (span) => {
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: texts,
      })
      span.setAttribute('ia.tokens_embedding', response.usage?.prompt_tokens ?? 0)
      return response.data.map(d => d.embedding)
    },
  )
}

// ── Job processor ──────────────────────────────────────────────────────────────

async function processJob(job: Job<VectorizePdfJob>): Promise<void> {
  const { materialId, storageKey } = job.data

  // Span raiz do job — o worker é um processo separado, então este trace não
  // tem o span HTTP do upload como pai; ele representa o trabalho assíncrono.
  return withSpan(
    'Vetorização de MI — mi.vetorizacao',
    { 'mi.id': materialId, 'mi.storage_key': storageKey, 'job.id': job.id ?? '' },
    async (spanJob) => runVectorizeJob(materialId, storageKey, spanJob),
  )
}

async function runVectorizeJob(materialId: string, storageKey: string, spanJob: Span): Promise<void> {
  logger.info({ materialId }, 'IN - vectorizeWorker')

  await prisma.materialInstrucional.update({
    where: { id: materialId },
    data:  { vectorStatus: 'PROCESSING' },
  })

  try {
    const pdfBuffer = await downloadPdfBuffer(storageKey)
    const { text }  = await withSpan(
      'mi.vetorizacao.extrair_texto',
      { 'mi.tamanho_bytes': pdfBuffer.length },
      async (span) => {
        const parsed = await pdfParse(pdfBuffer)
        span.setAttribute('mi.paginas',    parsed.numpages ?? 0)
        span.setAttribute('mi.caracteres', parsed.text?.length ?? 0)
        return parsed
      },
    )

    if (!text?.trim()) {
      spanJob.setAttribute('mi.sem_texto_extraivel', true)
      logger.warn({ materialId }, 'PDF has no extractable text — skipping')
      await prisma.materialInstrucional.update({
        where: { id: materialId },
        data:  { vectorStatus: 'FAILED' },
      })
      return
    }

    const chunks = withSpanSync(
      'mi.vetorizacao.chunking',
      { 'mi.caracteres': text.length, 'mi.chunk_size': CHUNK_SIZE, 'mi.chunk_overlap': CHUNK_OVERLAP },
      (span) => {
        const result = chunkText(text)
        span.setAttribute('mi.chunks_gerados', result.length)
        return result
      },
    )
    logger.info({ materialId, chunkCount: chunks.length }, 'PDF chunked')

    spanJob.setAttribute('mi.chunks_gerados', chunks.length)

    const qdrant = await getQdrant()

    // Remove pontos antigos para esse material (re-upload)
    await qdrant.delete(QDRANT_COLLECTION, {
      filter: { must: [{ key: 'materialId', match: { value: materialId } }] },
    })

    // Embeddings e upsert em batches
    for (let i = 0; i < chunks.length; i += EMBED_BATCH) {
      const batch      = chunks.slice(i, i + EMBED_BATCH)
      const embeddings = await embedBatch(batch)

      await withSpan(
        'mi.vetorizacao.qdrant_upsert',
        { 'mi.id': materialId, 'mi.chunks_no_batch': batch.length, 'busca.batch_inicial': i },
        async () => {
          await qdrant.upsert(QDRANT_COLLECTION, {
            wait:   true,
            points: batch.map((chunkText, j) => ({
              id:      randomUUID(),
              vector:  embeddings[j],
              payload: { materialId, chunkIndex: i + j, text: chunkText },
            })),
          })
        },
      )
    }

    await prisma.materialInstrucional.update({
      where: { id: materialId },
      data:  { vectorStatus: 'DONE' },
    })

    logger.info({ materialId, chunkCount: chunks.length }, 'OUT - vectorizeWorker')

    logger.info(
      {
        evento:          'mi_vetorizado',
        mi_id:           materialId,
        chunks_gerados:  chunks.length,
        caracteres:      text.length,
      },
      'Material Instrucional vetorizado',
    )
  } catch (err) {
    // Erro tratado: registra a exceção (com stack) antes de marcar o material
    // como FAILED. A chave `err` é a que o Pino serializa como exceção.
    logger.error(
      { err, evento: 'falha_vetorizacao', mi_id: materialId },
      'Falha ao vetorizar Material Instrucional',
    )

    await prisma.materialInstrucional.update({
      where: { id: materialId },
      data:  { vectorStatus: 'FAILED' },
    }).catch(() => {})
    throw err
  }
}

// ── Bootstrap ──────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  await ensureQdrantCollection()
  logger.info('Qdrant collection ready')

  const worker = new Worker<VectorizePdfJob>('vectorize-pdf', processJob, {
    connection: {
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
    },
    concurrency: 2,
  })

  worker.on('completed', job =>
    logger.info({ jobId: job.id, materialId: job.data.materialId }, 'vectorize job completed'),
  )
  worker.on('failed', (job, err) =>
    logger.error({ jobId: job?.id, materialId: job?.data.materialId, err }, 'vectorize job failed'),
  )

  logger.info('Vectorize worker running...')
}

main().catch(err => {
  logger.error(err, 'Worker startup failed')
  process.exit(1)
})
