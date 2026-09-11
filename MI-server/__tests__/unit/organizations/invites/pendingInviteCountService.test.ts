// __tests__/unit/organizations/invites/pendingInviteCountService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock('../../../../src/repositories/organizations/orgInvitesRepository', () => ({
  countPendingInvites: vi.fn(),
}))

vi.mock('../../../../src/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))

import { pendingInviteCountService } from '../../../../src/services/organizations/invites/pendingInviteCountService'
import { countPendingInvites }       from '../../../../src/repositories/organizations/orgInvitesRepository'
import { logger }                    from '../../../../src/lib/logger'

// ── Helpers ────────────────────────────────────────────────────────────────────

const USER_ID = 'bbbbbbbb-0000-4000-8000-000000000002'

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(countPendingInvites).mockResolvedValue(3)
})

// ── Testes ─────────────────────────────────────────────────────────────────────

describe('pendingInviteCountService', () => {
  describe('contagem (fluxo de sucesso)', () => {
    it('deve chamar countPendingInvites com o userId correto', async () => {
      await pendingInviteCountService({ userId: USER_ID })

      expect(vi.mocked(countPendingInvites)).toHaveBeenCalledWith(USER_ID)
    })

    it('deve retornar o objeto { count } com a contagem correta', async () => {
      const result = await pendingInviteCountService({ userId: USER_ID })

      expect(result).toEqual({ count: 3 })
    })

    it('deve retornar { count: 0 } quando não há convites pendentes', async () => {
      vi.mocked(countPendingInvites).mockResolvedValue(0)

      const result = await pendingInviteCountService({ userId: USER_ID })

      expect(result).toEqual({ count: 0 })
    })

    it('deve retornar contagem numérica', async () => {
      const result = await pendingInviteCountService({ userId: USER_ID })

      expect(typeof result.count).toBe('number')
    })
  })

  describe('validação de entrada', () => {
    it('deve lançar erro quando userId não é UUID válido', async () => {
      await expect(pendingInviteCountService({ userId: 'invalido' })).rejects.toThrow()
    })

    it('deve lançar erro quando userId está ausente', async () => {
      await expect(pendingInviteCountService({})).rejects.toThrow()
    })

    it('não deve chamar countPendingInvites quando validação falha', async () => {
      await pendingInviteCountService({ userId: 'invalido' }).catch(() => {})

      expect(vi.mocked(countPendingInvites)).not.toHaveBeenCalled()
    })
  })

  describe('logging de console (pino)', () => {
    it('deve logar "IN - pendingInviteCountService"', async () => {
      await pendingInviteCountService({ userId: USER_ID })

      expect(vi.mocked(logger.info)).toHaveBeenCalledWith('IN - pendingInviteCountService')
    })

    it('deve logar "OUT - pendingInviteCountService"', async () => {
      await pendingInviteCountService({ userId: USER_ID })

      expect(vi.mocked(logger.info)).toHaveBeenCalledWith('OUT - pendingInviteCountService')
    })
  })
})
