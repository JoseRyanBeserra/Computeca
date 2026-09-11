// __tests__/unit/scripts/aiBackfill.test.ts
// FR-015 — comando administrativo de reprocessamento do acervo pendente.
//
// Executado sob demanda, nunca automaticamente: o custo de tokens é
// proporcional ao acervo acumulado e a decisão de quando pagá-lo é do
// administrador.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const envMock = { AI_FEATURES_ENABLED: false }
const findMany = vi.fn()
const queueAdd = vi.fn()
const getVectorizeQueueMock = vi.fn()
const isAiEnabledMock = vi.fn()

vi.mock('dotenv/config', () => ({}))

vi.mock('../../../src/env', () => ({
  get env() {
    return envMock
  },
}))

vi.mock('../../../src/database/prisma', () => ({
  prisma: {
    materialInstrucional: { findMany: (...a: unknown[]) => findMany(...a) },
    $disconnect: vi.fn().mockResolvedValue(undefined),
  },
}))

vi.mock('../../../src/lib/queue', () => ({
  getVectorizeQueue:   () => getVectorizeQueueMock(),
  closeVectorizeQueue: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../../src/constants/features', () => ({
  isAiEnabled: () => isAiEnabledMock(),
}))

vi.mock('../../../src/lib/logger', () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}))

const logSpy   = vi.spyOn(console, 'log').mockImplementation(() => {})
const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

async function runBackfill(): Promise<void> {
  vi.resetModules()
  await import('../../../scripts/aiBackfill')
  // O script roda no import; aguarda o encadeamento de promessas resolver.
  await new Promise((r) => setTimeout(r, 0))
  await new Promise((r) => setTimeout(r, 0))
}

function saida(): string {
  return [...logSpy.mock.calls, ...errorSpy.mock.calls].map((c) => c.join(' ')).join('\n')
}

beforeEach(() => {
  vi.clearAllMocks()
  envMock.AI_FEATURES_ENABLED = true
  isAiEnabledMock.mockResolvedValue(true)
  getVectorizeQueueMock.mockReturnValue({ add: queueAdd })
  findMany.mockResolvedValue([])
  process.exitCode = undefined
})

afterEach(() => {
  process.exitCode = undefined
})

describe('ai:backfill — recusa de execução', () => {
  it('recusa quando a IA está desativada no ambiente', async () => {
    envMock.AI_FEATURES_ENABLED = false

    await runBackfill()

    expect(saida()).toMatch(/desativadas/i)
    expect(findMany).not.toHaveBeenCalled()
    expect(queueAdd).not.toHaveBeenCalled()
    expect(process.exitCode).toBe(1)
  })

  it('recusa quando a IA foi desligada pelo painel administrativo', async () => {
    envMock.AI_FEATURES_ENABLED = true
    isAiEnabledMock.mockResolvedValue(false)

    await runBackfill()

    expect(saida()).toMatch(/painel administrativo/i)
    expect(queueAdd).not.toHaveBeenCalled()
    expect(process.exitCode).toBe(1)
  })
})

describe('ai:backfill — seleção do acervo pendente', () => {
  it('seleciona APPROVED com vectorStatus PENDING ou FAILED, excluindo PROCESSING', async () => {
    await runBackfill()

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status:       'APPROVED',
          deletedAt:    null,
          vectorStatus: { in: ['PENDING', 'FAILED'] },
        }),
      }),
    )
  })

  it('informa o total antes de iniciar', async () => {
    findMany.mockResolvedValue([
      { id: 'm1', title: 'A', storageKey: 'k1', vectorStatus: 'PENDING' },
      { id: 'm2', title: 'B', storageKey: 'k2', vectorStatus: 'FAILED' },
    ])

    await runBackfill()

    expect(saida()).toMatch(/aguardando vetorização: 2/i)
  })

  it('encerra sem enfileirar quando não há pendências', async () => {
    findMany.mockResolvedValue([])

    await runBackfill()

    expect(saida()).toMatch(/Nada a reprocessar/i)
    expect(queueAdd).not.toHaveBeenCalled()
  })
})

describe('ai:backfill — enfileiramento', () => {
  it('enfileira um job por material pendente', async () => {
    findMany.mockResolvedValue([
      { id: 'm1', title: 'A', storageKey: 'k1', vectorStatus: 'PENDING' },
      { id: 'm2', title: 'B', storageKey: 'k2', vectorStatus: 'FAILED' },
    ])

    await runBackfill()

    expect(queueAdd).toHaveBeenCalledTimes(2)
    expect(queueAdd).toHaveBeenCalledWith('vectorize', { materialId: 'm1', storageKey: 'k1' })
    expect(queueAdd).toHaveBeenCalledWith('vectorize', { materialId: 'm2', storageKey: 'k2' })
  })

  it('apenas enfileira — não processa nada no próprio comando', async () => {
    findMany.mockResolvedValue([{ id: 'm1', title: 'A', storageKey: 'k1', vectorStatus: 'PENDING' }])

    await runBackfill()

    expect(saida()).toMatch(/worker processará a fila/i)
  })
})
