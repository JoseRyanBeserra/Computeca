// __tests__/unit/middlewares/requireAiEnabled.test.ts
// FR-004 — recusa uniforme quando as funcionalidades de IA estão indisponíveis.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { FastifyReply, FastifyRequest } from 'fastify'

const isAiEnabledMock = vi.fn()

vi.mock('../../../src/constants/features', () => ({
  isAiEnabled: () => isAiEnabledMock(),
}))

import { requireAiEnabled } from '../../../src/middlewares/requireAiEnabled'
import { GeneralErrorResponse } from '../../../src/errors/GeneralErrorResponse'
import { StatusCode } from '../../../src/utils/statusCode'

const request = {} as FastifyRequest
const reply   = {} as FastifyReply

beforeEach(() => {
  vi.clearAllMocks()
})

describe('requireAiEnabled', () => {
  it('não lança quando a IA está disponível', async () => {
    isAiEnabledMock.mockResolvedValue(true)

    await expect(requireAiEnabled(request, reply)).resolves.toBeUndefined()
  })

  it('lança 503 AI_DISABLED quando a IA está indisponível', async () => {
    isAiEnabledMock.mockResolvedValue(false)

    await expect(requireAiEnabled(request, reply)).rejects.toBeInstanceOf(GeneralErrorResponse)

    try {
      await requireAiEnabled(request, reply)
      expect.unreachable('deveria ter lançado')
    } catch (err) {
      const erro = err as GeneralErrorResponse
      expect(erro.statusCode).toBe(StatusCode.SERVICE_UNAVAILABLE)
      expect(erro.code).toBe('AI_DISABLED')
    }
  })

  it('consulta a disponibilidade a cada requisição, para refletir o painel sem reinício', async () => {
    isAiEnabledMock.mockResolvedValue(true)
    await requireAiEnabled(request, reply)

    isAiEnabledMock.mockResolvedValue(false)
    await expect(requireAiEnabled(request, reply)).rejects.toBeInstanceOf(GeneralErrorResponse)

    expect(isAiEnabledMock).toHaveBeenCalledTimes(2)
  })
})
