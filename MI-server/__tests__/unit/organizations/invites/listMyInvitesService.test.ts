// __tests__/unit/organizations/invites/listMyInvitesService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock('../../../../src/repositories/organizations/orgInvitesRepository', () => ({
  listMyInvites: vi.fn(),
}))

vi.mock('../../../../src/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))

import { listMyInvitesService } from '../../../../src/services/organizations/invites/listMyInvitesService'
import { listMyInvites }        from '../../../../src/repositories/organizations/orgInvitesRepository'
import { logger }               from '../../../../src/lib/logger'

// ── Helpers ────────────────────────────────────────────────────────────────────

const USER_ID = 'bbbbbbbb-0000-4000-8000-000000000002'

const MOCK_INVITES = [
  {
    id:             'eeeeeeee-0000-4000-8000-000000000001',
    organizationId: 'aaaaaaaa-0000-4000-8000-000000000001',
    invitedUserId:  USER_ID,
    invitedById:    'cccccccc-0000-4000-8000-000000000003',
    status:         'PENDING',
    createdAt:      new Date('2026-01-01'),
    respondedAt:    null,
    organization:   { name: 'Projeto Alpha' },
    invitedBy:      { name: 'Sender' },
  },
]

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(listMyInvites).mockResolvedValue(MOCK_INVITES)
})

// ── Testes ─────────────────────────────────────────────────────────────────────

describe('listMyInvitesService', () => {
  describe('listagem (fluxo de sucesso)', () => {
    it('deve chamar listMyInvites com o userId correto', async () => {
      await listMyInvitesService({ userId: USER_ID })

      expect(vi.mocked(listMyInvites)).toHaveBeenCalledWith(USER_ID)
    })

    it('deve retornar a lista de convites do usuário', async () => {
      const result = await listMyInvitesService({ userId: USER_ID })

      expect(result).toHaveLength(1)
      expect(result[0].status).toBe('PENDING')
    })

    it('deve retornar lista vazia quando não há convites', async () => {
      vi.mocked(listMyInvites).mockResolvedValue([])

      const result = await listMyInvitesService({ userId: USER_ID })

      expect(result).toEqual([])
    })

    it('deve incluir informações da organização no convite', async () => {
      const result = await listMyInvitesService({ userId: USER_ID })

      expect(result[0].organization.name).toBe('Projeto Alpha')
    })
  })

  describe('validação de entrada', () => {
    it('deve lançar erro quando userId não é UUID válido', async () => {
      await expect(listMyInvitesService({ userId: 'invalido' })).rejects.toThrow()
    })

    it('deve lançar erro quando userId está ausente', async () => {
      await expect(listMyInvitesService({})).rejects.toThrow()
    })

    it('não deve chamar listMyInvites quando validação falha', async () => {
      await listMyInvitesService({ userId: 'invalido' }).catch(() => {})

      expect(vi.mocked(listMyInvites)).not.toHaveBeenCalled()
    })
  })

  describe('logging de console (pino)', () => {
    it('deve logar "IN - listMyInvitesService"', async () => {
      await listMyInvitesService({ userId: USER_ID })

      expect(vi.mocked(logger.info)).toHaveBeenCalledWith('IN - listMyInvitesService')
    })

    it('deve logar "OUT - listMyInvitesService"', async () => {
      await listMyInvitesService({ userId: USER_ID })

      expect(vi.mocked(logger.info)).toHaveBeenCalledWith('OUT - listMyInvitesService')
    })
  })
})
