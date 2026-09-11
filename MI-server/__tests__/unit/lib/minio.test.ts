// __tests__/unit/lib/minio.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockClient } = vi.hoisted(() => ({
  mockClient: {
    bucketExists: vi.fn(),
    makeBucket:   vi.fn(),
  },
}))

vi.mock('minio', () => ({
  // function expression (não arrow) para ser construível via `new Client()`
  Client: vi.fn(function () { return mockClient }),
}))

vi.mock('../../../src/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

import { ensureBucket, MINIO_BUCKET } from '../../../src/lib/minio'

describe('lib/minio — ensureBucket', () => {
  beforeEach(() => {
    mockClient.bucketExists.mockReset()
    mockClient.makeBucket.mockReset()
  })

  it('não cria o bucket quando ele já existe', async () => {
    mockClient.bucketExists.mockResolvedValue(true)

    await ensureBucket()

    expect(mockClient.bucketExists).toHaveBeenCalledWith(MINIO_BUCKET)
    expect(mockClient.makeBucket).not.toHaveBeenCalled()
  })

  it('cria o bucket quando ele não existe', async () => {
    mockClient.bucketExists.mockResolvedValue(false)
    mockClient.makeBucket.mockResolvedValue(undefined)

    await ensureBucket()

    expect(mockClient.makeBucket).toHaveBeenCalledWith(MINIO_BUCKET)
  })

  it('propaga o erro quando a verificação do bucket falha', async () => {
    mockClient.bucketExists.mockRejectedValue(new Error('minio down'))

    await expect(ensureBucket()).rejects.toThrow('minio down')
  })
})
