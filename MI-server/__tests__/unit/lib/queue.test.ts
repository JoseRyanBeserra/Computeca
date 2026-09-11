// __tests__/unit/lib/queue.test.ts
// A fila de vetorização não pode abrir conexão com o Redis no import do módulo.
//
// Antes desta feature, `lib/queue.ts` executava `new Queue(...)` e
// `waitUntilReady()` no corpo do módulo: qualquer import na cadeia — mesmo num
// fluxo que não enfileira nada — conectava ao Redis. Com a IA desativada o
// serviço sequer existe no ambiente, e a tentativa produzia erro recorrente.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const QueueConstructor = vi.fn()

vi.mock('bullmq', () => ({
  Queue: class {
    on = vi.fn()
    waitUntilReady = vi.fn().mockResolvedValue(undefined)
    close = vi.fn().mockResolvedValue(undefined)

    constructor(...args: unknown[]) {
      QueueConstructor(...args)
    }
  },
}))

const envMock = { AI_FEATURES_ENABLED: false, REDIS_HOST: '127.0.0.1', REDIS_PORT: 6379 }

vi.mock('../../../src/env', () => ({
  get env() {
    return envMock
  },
}))

vi.mock('../../../src/lib/logger', () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}))

import { getVectorizeQueue, closeVectorizeQueue, VECTORIZE_QUEUE_NAME } from '../../../src/lib/queue'

beforeEach(async () => {
  await closeVectorizeQueue()
  QueueConstructor.mockClear()
  envMock.AI_FEATURES_ENABLED = false
})

describe('queue — nenhuma conexão no import', () => {
  it('importar o módulo não instancia a Queue', () => {
    // O import aconteceu no topo deste arquivo; se o módulo conectasse na carga,
    // o construtor já teria sido chamado antes de qualquer teste rodar.
    expect(QueueConstructor).not.toHaveBeenCalled()
  })
})

describe('queue — IA desativada', () => {
  it('getVectorizeQueue retorna null e não instancia a Queue', () => {
    envMock.AI_FEATURES_ENABLED = false

    expect(getVectorizeQueue()).toBeNull()
    expect(QueueConstructor).not.toHaveBeenCalled()
  })
})

describe('queue — IA ativada', () => {
  it('instancia a Queue sob demanda, com o nome e a conexão corretos', () => {
    envMock.AI_FEATURES_ENABLED = true

    const queue = getVectorizeQueue()

    expect(queue).not.toBeNull()
    expect(QueueConstructor).toHaveBeenCalledTimes(1)
    expect(QueueConstructor).toHaveBeenCalledWith(
      VECTORIZE_QUEUE_NAME,
      expect.objectContaining({
        connection: { host: '127.0.0.1', port: 6379 },
      }),
    )
  })

  it('reaproveita a instância entre chamadas', () => {
    envMock.AI_FEATURES_ENABLED = true

    const first  = getVectorizeQueue()
    const second = getVectorizeQueue()

    expect(first).toBe(second)
    expect(QueueConstructor).toHaveBeenCalledTimes(1)
  })
})
