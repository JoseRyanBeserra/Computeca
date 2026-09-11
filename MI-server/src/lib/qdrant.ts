import { env } from '../env'
import { logger } from './logger'

export const QDRANT_COLLECTION = 'materiais_instrucionais'
export const VECTOR_SIZE       = 1536 // text-embedding-3-small

// Tipo inline para evitar import estático de módulo ESM-only
type QdrantClientInstance = {
  getCollections(): Promise<{ collections: Array<{ name: string }> }>
  createCollection(name: string, params: { vectors: { size: number; distance: string } }): Promise<unknown>
  upsert(name: string, params: {
    wait?: boolean
    points: Array<{ id: string; vector: number[]; payload?: Record<string, unknown> }>
  }): Promise<unknown>
  delete(name: string, params: {
    filter: { must: Array<{ key: string; match: { value: unknown } }> }
  }): Promise<unknown>
  search(name: string, params: {
    vector: number[]
    limit:  number
    filter?: { must: Array<{ key: string; match: { value: unknown } }> }
    with_payload?: boolean
  }): Promise<Array<{
    id:       string | number
    score:    number
    payload?: Record<string, unknown>
  }>>
  scroll(name: string, params: {
    filter?:       { must: Array<{ key: string; match: { value: unknown } }> }
    limit?:        number
    offset?:       string | number | null
    with_payload?: boolean
    with_vector?:  boolean
  }): Promise<{
    points: Array<{ id: string | number; payload?: Record<string, unknown> }>
    next_page_offset?: string | number | null
  }>
}

let _client: QdrantClientInstance | null = null

// Dynamic import necessário pois @qdrant/js-client-rest é ESM-only
export async function getQdrant(): Promise<QdrantClientInstance> {
  if (!_client) {
    const { QdrantClient } = await import('@qdrant/js-client-rest')
    _client = new QdrantClient({
      url:    env.QDRANT_URL,
      apiKey: env.QDRANT_API_KEY,
    }) as unknown as QdrantClientInstance
  }
  return _client
}

export async function ensureQdrantCollection(): Promise<void> {
  const client = await getQdrant()
  const { collections } = await client.getCollections()

  logger.info({ url: env.QDRANT_URL, collection: QDRANT_COLLECTION }, 'Qdrant: conexão estabelecida ✅')

  if (collections.some(c => c.name === QDRANT_COLLECTION)) {
    logger.info({ collection: QDRANT_COLLECTION }, 'Qdrant: collection já existe')
    return
  }

  await client.createCollection(QDRANT_COLLECTION, {
    vectors: { size: VECTOR_SIZE, distance: 'Cosine' },
  })
  logger.info({ collection: QDRANT_COLLECTION, vectorSize: VECTOR_SIZE }, 'Qdrant: collection criada ✅')
}
