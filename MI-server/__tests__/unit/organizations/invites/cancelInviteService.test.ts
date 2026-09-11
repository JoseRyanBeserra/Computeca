// __tests__/unit/organizations/invites/cancelInviteService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock('../../../../src/repositories/organizations/orgInvitesRepository', () => ({
  findInviteById:     vi.fn(),
  updateInviteStatus: vi.fn(),
}))

vi.mock('../../../../src/repositories/organizations/orgMembersRepository', () => ({
  findMembership: vi.fn(),
}))

vi.mock('../../../../src/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))

import { cancelInviteService }               from '../../../../src/services/organizations/invites/cancelInviteService'
import { findInviteById, updateInviteStatus } from '../../../../src/repositories/organizations/orgInvitesRepository'
import { findMembership }                    from '../../../../src/repositories/organizations/orgMembersRepository'
import { logger }                            from '../../../../src/lib/logger'
import { GeneralErrorResponse }              from '../../../../src/errors/GeneralErrorResponse'

// ── Helpers ────────────────────────────────────────────────────────────────────

const INVITE_ID   = 'eeeeeeee-0000-4000-8000-000000000001'
const ORG_ID      = 'aaaaaaaa-0000-4000-8000-000000000001'
const REQUESTER_ID = 'bbbbbbbb-0000-4000-8000-000000000002'

const MOCK_INVITE = {
  id:             INVITE_ID,
  organizationId: ORG_ID,
  invitedUserId:  'cccccccc-0000-4000-8000-000000000003',
  invitedById:    REQUESTER_ID,
  status:         'PENDING',
  createdAt:      new Date('2026-01-01'),
  respondedAt:    null,
  organization:   { name: 'Projeto Alpha' },
  invitedBy:      { name: 'Sender' },
}

const VALID_INPUT = { inviteId: INVITE_ID, requestingUserId: REQUESTER_ID }

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()

  vi.mocked(findInviteById).mockResolvedValue(MOCK_INVITE)
  vi.mocked(findMembership).mockResolvedValue({ id: 'member-id', role: 'ADMIN' })
  vi.mocked(updateInviteStatus).mockResolvedValue(undefined)
})

// ── Testes ─────────────────────────────────────────────────────────────────────

describe('cancelInviteService', () => {
  describe('cancelamento de convite (fluxo de sucesso)', () => {
    it('deve cancelar o convite atualizando status para CANCELLED', async () => {
      await cancelInviteService(VALID_INPUT)

      expect(vi.mocked(updateInviteStatus)).toHaveBeenCalledWith(INVITE_ID, 'CANCELLED')
    })

    it('deve verificar a existência do convite', async () => {
      await cancelInviteService(VALID_INPUT)

      expect(vi.mocked(findInviteById)).toHaveBeenCalledWith(INVITE_ID)
    })

    it('deve verificar a membership do solicitante na org do convite', async () => {
      await cancelInviteService(VALID_INPUT)

      expect(vi.mocked(findMembership)).toHaveBeenCalledWith(ORG_ID, REQUESTER_ID)
    })

    it('deve funcionar quando solicitante é PROFESSOR da org', async () => {
      vi.mocked(findMembership).mockResolvedValue({ id: 'member-id', role: 'PROFESSOR' })

      await cancelInviteService(VALID_INPUT)

      expect(vi.mocked(updateInviteStatus)).toHaveBeenCalledWith(INVITE_ID, 'CANCELLED')
    })
  })

  describe('erros de negócio', () => {
    it('deve lançar 404 quando o convite não existe', async () => {
      vi.mocked(findInviteById).mockResolvedValue(null)

      const error = await cancelInviteService(VALID_INPUT).catch(e => e)

      expect(error).toBeInstanceOf(GeneralErrorResponse)
      expect((error as GeneralErrorResponse).statusCode).toBe(404)
      expect((error as GeneralErrorResponse).code).toBe('INVITE_NOT_FOUND')
    })

    it('deve lançar 400 quando o convite não está pendente (ACCEPTED)', async () => {
      vi.mocked(findInviteById).mockResolvedValue({ ...MOCK_INVITE, status: 'ACCEPTED' })

      const error = await cancelInviteService(VALID_INPUT).catch(e => e)

      expect(error).toBeInstanceOf(GeneralErrorResponse)
      expect((error as GeneralErrorResponse).statusCode).toBe(400)
      expect((error as GeneralErrorResponse).code).toBe('INVITE_NOT_PENDING')
    })

    it('deve lançar 400 quando o convite está REJECTED', async () => {
      vi.mocked(findInviteById).mockResolvedValue({ ...MOCK_INVITE, status: 'REJECTED' })

      const error = await cancelInviteService(VALID_INPUT).catch(e => e)

      expect(error).toBeInstanceOf(GeneralErrorResponse)
      expect((error as GeneralErrorResponse).statusCode).toBe(400)
    })

    it('deve lançar 403 quando solicitante não é membro da org', async () => {
      vi.mocked(findMembership).mockResolvedValue(null)

      const error = await cancelInviteService(VALID_INPUT).catch(e => e)

      expect(error).toBeInstanceOf(GeneralErrorResponse)
      expect((error as GeneralErrorResponse).statusCode).toBe(403)
      expect((error as GeneralErrorResponse).code).toBe('ORG_NOT_STAFF')
    })

    it('deve lançar 403 quando solicitante é MEMBER (não staff)', async () => {
      vi.mocked(findMembership).mockResolvedValue({ id: 'member-id', role: 'MEMBER' })

      const error = await cancelInviteService(VALID_INPUT).catch(e => e)

      expect(error).toBeInstanceOf(GeneralErrorResponse)
      expect((error as GeneralErrorResponse).statusCode).toBe(403)
      expect((error as GeneralErrorResponse).code).toBe('ORG_NOT_STAFF')
    })

    it('não deve chamar updateInviteStatus quando convite não existe', async () => {
      vi.mocked(findInviteById).mockResolvedValue(null)

      await cancelInviteService(VALID_INPUT).catch(() => {})

      expect(vi.mocked(updateInviteStatus)).not.toHaveBeenCalled()
    })

    it('não deve chamar updateInviteStatus quando não autorizado', async () => {
      vi.mocked(findMembership).mockResolvedValue(null)

      await cancelInviteService(VALID_INPUT).catch(() => {})

      expect(vi.mocked(updateInviteStatus)).not.toHaveBeenCalled()
    })
  })

  describe('validação de entrada', () => {
    it('deve lançar erro quando inviteId não é UUID válido', async () => {
      await expect(
        cancelInviteService({ inviteId: 'invalido', requestingUserId: REQUESTER_ID }),
      ).rejects.toThrow()
    })

    it('deve lançar erro quando requestingUserId não é UUID válido', async () => {
      await expect(
        cancelInviteService({ inviteId: INVITE_ID, requestingUserId: 'invalido' }),
      ).rejects.toThrow()
    })
  })

  describe('logging de console (pino)', () => {
    it('deve logar "IN - cancelInviteService"', async () => {
      await cancelInviteService(VALID_INPUT)

      expect(vi.mocked(logger.info)).toHaveBeenCalledWith('IN - cancelInviteService')
    })

    it('deve logar "OUT - cancelInviteService"', async () => {
      await cancelInviteService(VALID_INPUT)

      expect(vi.mocked(logger.info)).toHaveBeenCalledWith('OUT - cancelInviteService')
    })
  })
})
