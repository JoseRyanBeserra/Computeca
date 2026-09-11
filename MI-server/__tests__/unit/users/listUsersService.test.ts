// __tests__/unit/users/listUsersService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ──────────────────────────────────────────────────────────────────────
vi.mock('../../../src/repositories/users/usersRepository', () => ({
  listUsers: vi.fn(),
}))

vi.mock('../../../src/lib/logger', () => ({
  logger: {
    info:  vi.fn(),
    error: vi.fn(),
    warn:  vi.fn(),
    debug: vi.fn(),
  },
}))

import { listUsersService } from '../../../src/services/users/listUsersService'
import { listUsers }        from '../../../src/repositories/users/usersRepository'
import { logger }           from '../../../src/lib/logger'

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeListResult(overrides: Record<string, unknown> = {}) {
  return { users: [], total: 0, page: 1, perPage: 20, ...overrides }
}

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(listUsers).mockResolvedValue(makeListResult())
})

// ── Testes ─────────────────────────────────────────────────────────────────────

describe('listUsersService', () => {
  describe('fluxo de sucesso', () => {
    it('deve chamar listUsers com os parâmetros validados e paginação default', async () => {
      await listUsersService({})

      expect(vi.mocked(listUsers)).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, perPage: 20 }),
      )
    })

    it('deve converter page e perPage de string para número', async () => {
      await listUsersService({ page: '2', perPage: '10' })

      expect(vi.mocked(listUsers)).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2, perPage: 10 }),
      )
    })

    it('deve retornar o resultado de listUsers sem modificações', async () => {
      const mockResult = makeListResult({ total: 3 })
      vi.mocked(listUsers).mockResolvedValue(mockResult)

      const result = await listUsersService({})

      expect(result).toEqual(mockResult)
    })

    it('deve passar filtro de role quando informado', async () => {
      await listUsersService({ role: 'PROFESSOR' })

      expect(vi.mocked(listUsers)).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'PROFESSOR' }),
      )
    })

    it('deve converter filtro suspended de string "true" para boolean true', async () => {
      await listUsersService({ suspended: 'true' })

      expect(vi.mocked(listUsers)).toHaveBeenCalledWith(
        expect.objectContaining({ suspended: true }),
      )
    })

    it('deve converter filtro suspended de string "false" para boolean false', async () => {
      await listUsersService({ suspended: 'false' })

      expect(vi.mocked(listUsers)).toHaveBeenCalledWith(
        expect.objectContaining({ suspended: false }),
      )
    })

    it('deve omitir suspended de listUsers quando não informado', async () => {
      await listUsersService({})

      const call = vi.mocked(listUsers).mock.calls[0][0]
      expect(call.suspended).toBeUndefined()
    })
  })

  describe('validação de entrada', () => {
    it('deve lançar erro quando role é um valor inválido', async () => {
      await expect(
        listUsersService({ role: 'SUPER_ADMIN' }),
      ).rejects.toThrow()
    })

    it('deve lançar erro quando page é menor que 1', async () => {
      await expect(
        listUsersService({ page: '0' }),
      ).rejects.toThrow()
    })

    it('deve lançar erro quando perPage excede o máximo de 100', async () => {
      await expect(
        listUsersService({ perPage: '101' }),
      ).rejects.toThrow()
    })

    it('não deve chamar listUsers quando a validação falha', async () => {
      await listUsersService({ role: 'INVALIDO' }).catch(() => {})

      expect(vi.mocked(listUsers)).not.toHaveBeenCalled()
    })
  })

  describe('logging de console (pino)', () => {
    it('deve logar "IN - listUsersService" ao iniciar', async () => {
      await listUsersService({})

      expect(vi.mocked(logger.info)).toHaveBeenCalledWith('IN - listUsersService')
    })

    it('deve logar "OUT - listUsersService" ao concluir', async () => {
      await listUsersService({})

      expect(vi.mocked(logger.info)).toHaveBeenCalledWith('OUT - listUsersService')
    })

    it('deve logar IN antes de OUT', async () => {
      await listUsersService({})

      const calls = vi.mocked(logger.info).mock.calls.map((c) => c[0])
      const inIdx  = calls.indexOf('IN - listUsersService')
      const outIdx = calls.indexOf('OUT - listUsersService')
      expect(inIdx).toBeGreaterThanOrEqual(0)
      expect(inIdx).toBeLessThan(outIdx)
    })

    it('deve logar IN mesmo quando a validação falha', async () => {
      await listUsersService({ role: 'INVALIDO' }).catch(() => {})

      expect(vi.mocked(logger.info)).toHaveBeenCalledWith('IN - listUsersService')
    })
  })
})
