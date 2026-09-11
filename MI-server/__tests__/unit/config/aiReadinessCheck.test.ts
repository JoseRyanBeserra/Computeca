// __tests__/unit/config/aiReadinessCheck.test.ts
// FR-006 e FR-018 — verificação dos serviços de apoio na inicialização.
//
// Com a IA desativada nada é verificado e nenhuma conexão é aberta. Com a IA
// ativada, a indisponibilidade de cada serviço é reportada de forma específica,
// sem impedir a subida da aplicação.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const envMock = {
  AI_FEATURES_ENABLED: false,
  REDIS_HOST: '127.0.0.1',
  REDIS_PORT: 6379,
  QDRANT_URL: 'http://127.0.0.1:6333',
}

vi.mock('../../../src/env', () => ({
  get env() {
    return envMock
  },
}))

vi.mock('../../../src/lib/logger', () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}))

vi.mock('../../../src/lib/queue', () => ({
  getVectorizeQueue:   vi.fn(),
  closeVectorizeQueue: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../../src/lib/qdrant', () => ({
  ensureQdrantCollection: vi.fn(),
}))

import { checkAiServicesReadiness } from '../../../src/lib/aiReadiness'
import { getVectorizeQueue } from '../../../src/lib/queue'
import { ensureQdrantCollection } from '../../../src/lib/qdrant'
import { logger } from '../../../src/lib/logger'

const queueMock  = vi.mocked(getVectorizeQueue)
const qdrantMock = vi.mocked(ensureQdrantCollection)

function fakeQueue(ready: Promise<void>) {
  return { waitUntilReady: vi.fn(() => ready) } as never
}

beforeEach(() => {
  vi.clearAllMocks()
  envMock.AI_FEATURES_ENABLED = false
})

describe('checkAiServicesReadiness — IA desativada', () => {
  it('não verifica nada e não abre conexão alguma', async () => {
    envMock.AI_FEATURES_ENABLED = false

    const report = await checkAiServicesReadiness()

    expect(report).toEqual({ checked: false, redis: false, qdrant: false })
    expect(queueMock).not.toHaveBeenCalled()
    expect(qdrantMock).not.toHaveBeenCalled()
  })

  it('não registra advertência quando a IA está desligada', async () => {
    envMock.AI_FEATURES_ENABLED = false

    await checkAiServicesReadiness()

    expect(logger.warn).not.toHaveBeenCalled()
  })
})

describe('checkAiServicesReadiness — IA ativada', () => {
  it('reporta os dois serviços alcançáveis', async () => {
    envMock.AI_FEATURES_ENABLED = true
    queueMock.mockReturnValue(fakeQueue(Promise.resolve()))
    qdrantMock.mockResolvedValue(undefined as never)

    const report = await checkAiServicesReadiness()

    expect(report).toEqual({ checked: true, redis: true, qdrant: true })
    expect(logger.warn).not.toHaveBeenCalled()
  })

  it('Redis inalcançável: registra advertência específica e NÃO derruba a aplicação', async () => {
    envMock.AI_FEATURES_ENABLED = true
    queueMock.mockReturnValue(fakeQueue(Promise.reject(new Error('ECONNREFUSED'))))
    qdrantMock.mockResolvedValue(undefined as never)

    const report = await checkAiServicesReadiness()

    expect(report.redis).toBe(false)
    expect(report.qdrant).toBe(true)

    const mensagens = vi.mocked(logger.warn).mock.calls.map((c) => JSON.stringify(c))
    expect(mensagens.some((m) => m.includes('Redis INALCANÇÁVEL'))).toBe(true)
  })

  it('Qdrant inalcançável: registra advertência específica e segue', async () => {
    envMock.AI_FEATURES_ENABLED = true
    queueMock.mockReturnValue(fakeQueue(Promise.resolve()))
    qdrantMock.mockRejectedValue(new Error('sem resposta'))

    const report = await checkAiServicesReadiness()

    expect(report.qdrant).toBe(false)
    expect(report.redis).toBe(true)

    const mensagens = vi.mocked(logger.warn).mock.calls.map((c) => JSON.stringify(c))
    expect(mensagens.some((m) => m.includes('Qdrant INALCANÇÁVEL'))).toBe(true)
  })

  it('ambos fora do ar: reporta os dois e ainda assim resolve sem lançar', async () => {
    envMock.AI_FEATURES_ENABLED = true
    queueMock.mockReturnValue(fakeQueue(Promise.reject(new Error('ECONNREFUSED'))))
    qdrantMock.mockRejectedValue(new Error('sem resposta'))

    await expect(checkAiServicesReadiness()).resolves.toEqual({
      checked: true,
      redis:   false,
      qdrant:  false,
    })
  })
})
