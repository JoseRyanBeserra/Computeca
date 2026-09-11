// __tests__/unit/lib/qdrant.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockClient } = vi.hoisted(() => ({
  mockClient: {
    getCollections:   vi.fn(),
    createCollection: vi.fn(),
  },
}))

vi.mock('@qdrant/js-client-rest', () => ({
  // function expression (não arrow) para ser construível via `new QdrantClient()`
  QdrantClient: vi.fn(function () { return mockClient }),
}))

vi.mock('../../../src/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

import {
  getQdrant,
  ensureQdrantCollection,
  QDRANT_COLLECTION,
  VECTOR_SIZE,
} from '../../../src/lib/qdrant'

describe('lib/qdrant', () => {
  beforeEach(() => {
    mockClient.getCollections.mockReset()
    mockClient.createCollection.mockReset()
  })

  it('getQdrant retorna a mesma instância (singleton)', async () => {
    const a = await getQdrant()
    const b = await getQdrant()
    expect(a).toBe(mockClient)
    expect(a).toBe(b)
  })

  it('ensureQdrantCollection cria a collection quando ela não existe', async () => {
    mockClient.getCollections.mockResolvedValue({ collections: [] })
    mockClient.createCollection.mockResolvedValue(undefined)

    await ensureQdrantCollection()

    expect(mockClient.createCollection).toHaveBeenCalledWith(QDRANT_COLLECTION, {
      vectors: { size: VECTOR_SIZE, distance: 'Cosine' },
    })
  })

  it('ensureQdrantCollection não recria quando a collection já existe', async () => {
    mockClient.getCollections.mockResolvedValue({ collections: [{ name: QDRANT_COLLECTION }] })

    await ensureQdrantCollection()

    expect(mockClient.createCollection).not.toHaveBeenCalled()
  })
})
