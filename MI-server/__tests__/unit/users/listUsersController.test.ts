// __tests__/unit/users/listUsersController.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { FastifyRequest, FastifyReply } from 'fastify'

// ── Mocks ──────────────────────────────────────────────────────────────────────
vi.mock('../../../src/services/users/listUsersService', () => ({
  listUsersService: vi.fn(),
}))

vi.mock('../../../src/lib/logger', () => ({
  logger: {
    info:  vi.fn(),
    error: vi.fn(),
    warn:  vi.fn(),
    debug: vi.fn(),
  },
}))

import { listUsersController } from '../../../src/controllers/users/listUsersController'
import { listUsersService }    from '../../../src/services/users/listUsersService'
import { logger }              from '../../../src/lib/logger'
import { GeneralErrorResponse } from '../../../src/errors/GeneralErrorResponse'

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeMockRequest(overrides: Partial<{ query: object; user: object }> = {}): FastifyRequest {
  return {
    query: {},
    user: { sub: 'admin-uuid-123', role: 'ADMIN', canUpload: false },
    ...overrides,
  } as unknown as FastifyRequest
}

function makeMockReply(): FastifyReply {
  return {
    status: vi.fn().mockReturnThis(),
    send:   vi.fn().mockReturnThis(),
  } as unknown as FastifyReply
}

function makeListResult() {
  return { users: [], total: 0, page: 1, perPage: 20 }
}

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(listUsersService).mockResolvedValue(makeListResult())
})

// ── Testes ─────────────────────────────────────────────────────────────────────

describe('listUsersController', () => {
  describe('fluxo de sucesso', () => {
    it('deve chamar listUsersService com request.query', async () => {
      const request = makeMockRequest({ query: { role: 'PROFESSOR', page: '1' } })

      await listUsersController(request, makeMockReply())

      expect(vi.mocked(listUsersService)).toHaveBeenCalledWith({ role: 'PROFESSOR', page: '1' })
    })

    it('deve responder com status 200', async () => {
      const reply = makeMockReply()

      await listUsersController(makeMockRequest(), reply)

      expect(reply.status).toHaveBeenCalledWith(200)
    })

    it('deve enviar o resultado do service no body da resposta', async () => {
      const mockResult = makeListResult()
      vi.mocked(listUsersService).mockResolvedValue(mockResult)
      const reply = makeMockReply()

      await listUsersController(makeMockRequest(), reply)

      expect(reply.send).toHaveBeenCalledWith(mockResult)
    })
  })

  describe('autorização', () => {
    it('deve lançar GeneralErrorResponse 403 quando role é COMMON', async () => {
      const request = makeMockRequest({
        user: { sub: 'user-uuid', role: 'COMMON', canUpload: false },
      })

      const error = await listUsersController(request, makeMockReply()).catch((e) => e)

      expect(error).toBeInstanceOf(GeneralErrorResponse)
      expect((error as GeneralErrorResponse).statusCode).toBe(403)
    })

    it('deve lançar 403 quando role é PROFESSOR', async () => {
      const request = makeMockRequest({
        user: { sub: 'prof-uuid', role: 'PROFESSOR', canUpload: false },
      })

      const error = await listUsersController(request, makeMockReply()).catch((e) => e)

      expect(error).toBeInstanceOf(GeneralErrorResponse)
      expect((error as GeneralErrorResponse).statusCode).toBe(403)
    })

    it('não deve chamar listUsersService quando não autorizado', async () => {
      const request = makeMockRequest({
        user: { sub: 'user-uuid', role: 'COMMON', canUpload: false },
      })

      await listUsersController(request, makeMockReply()).catch(() => {})

      expect(vi.mocked(listUsersService)).not.toHaveBeenCalled()
    })
  })

  describe('logging de console (pino)', () => {
    it('deve logar "IN - listUsersController" ao receber a requisição', async () => {
      await listUsersController(makeMockRequest(), makeMockReply())

      expect(vi.mocked(logger.info)).toHaveBeenCalledWith('IN - listUsersController')
    })

    it('deve logar "OUT - listUsersController" após responder com sucesso', async () => {
      await listUsersController(makeMockRequest(), makeMockReply())

      expect(vi.mocked(logger.info)).toHaveBeenCalledWith('OUT - listUsersController')
    })

    it('deve logar ERROR quando o service lança exceção', async () => {
      vi.mocked(listUsersService).mockRejectedValue(new Error('db failure'))

      await listUsersController(makeMockRequest(), makeMockReply()).catch(() => {})

      expect(vi.mocked(logger.error)).toHaveBeenCalledWith(
        expect.objectContaining({ err: expect.any(Error) }),
        'ERROR - listUsersController',
      )
    })

    it('deve logar IN mesmo quando não autorizado', async () => {
      const request = makeMockRequest({
        user: { sub: 'user-uuid', role: 'COMMON', canUpload: false },
      })

      await listUsersController(request, makeMockReply()).catch(() => {})

      expect(vi.mocked(logger.info)).toHaveBeenCalledWith('IN - listUsersController')
    })
  })
})
