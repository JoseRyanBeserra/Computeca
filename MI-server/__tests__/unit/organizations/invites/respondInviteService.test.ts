// __tests__/unit/organizations/invites/respondInviteService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock('../../../../src/repositories/organizations/orgInvitesRepository', () => ({
  findInviteById:    vi.fn(),
  updateInviteStatus: vi.fn(),
}))

vi.mock('../../../../src/repositories/organizations/orgMembersRepository', () => ({
  findMembership: vi.fn(),
  addMember:      vi.fn(),
}))

vi.mock('../../../../src/repositories/users/usersRepository', () => ({
  findUserById: vi.fn(),
}))

vi.mock('../../../../src/repositories/organizations/orgRepository', () => ({
  findOrgById: vi.fn(),
}))

vi.mock('../../../../src/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))

import { respondInviteService }                   from '../../../../src/services/organizations/invites/respondInviteService'
import { findInviteById, updateInviteStatus }      from '../../../../src/repositories/organizations/orgInvitesRepository'
import { findMembership, addMember }              from '../../../../src/repositories/organizations/orgMembersRepository'
import { findUserById }                           from '../../../../src/repositories/users/usersRepository'
import { findOrgById }                            from '../../../../src/repositories/organizations/orgRepository'
import { logger }                                 from '../../../../src/lib/logger'
import { GeneralErrorResponse }                   from '../../../../src/errors/GeneralErrorResponse'

// ── Helpers ────────────────────────────────────────────────────────────────────

const INVITE_ID = 'eeeeeeee-0000-4000-8000-000000000001'
const ORG_ID    = 'aaaaaaaa-0000-4000-8000-000000000001'
const USER_ID   = 'bbbbbbbb-0000-4000-8000-000000000002'
const SENDER_ID = 'cccccccc-0000-4000-8000-000000000003'

const MOCK_INVITE = {
  id:             INVITE_ID,
  organizationId: ORG_ID,
  invitedUserId:  USER_ID,
  invitedById:    SENDER_ID,
  status:         'PENDING',
  createdAt:      new Date('2026-01-01'),
  respondedAt:    null,
  organization:   { name: 'Projeto Alpha' },
  invitedBy:      { name: 'Sender' },
}

const MOCK_ORG = {
  id:          ORG_ID,
  name:        'Projeto Alpha',
  description: null,
  status:      'ACTIVE',
  createdById: SENDER_ID,
  createdAt:   new Date('2026-01-01'),
  updatedAt:   new Date('2026-01-01'),
}

const MOCK_USER_COMMON = {
  id:            USER_ID,
  name:          'João Comum',
  email:         'joao@example.com',
  role:          'COMMON',
  canUpload:     false,
  emailVerified: true,
  suspended:     false,
  createdAt:     new Date('2026-01-01'),
  updatedAt:     new Date('2026-01-01'),
}

const ACCEPT_INPUT = { inviteId: INVITE_ID, userId: USER_ID, action: 'ACCEPT' }
const REJECT_INPUT = { inviteId: INVITE_ID, userId: USER_ID, action: 'REJECT' }

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()

  vi.mocked(findInviteById).mockResolvedValue(MOCK_INVITE)
  vi.mocked(findOrgById).mockResolvedValue(MOCK_ORG)
  vi.mocked(findMembership).mockResolvedValue(null)
  vi.mocked(findUserById).mockResolvedValue(MOCK_USER_COMMON)
  vi.mocked(updateInviteStatus).mockResolvedValue(undefined)
  vi.mocked(addMember).mockResolvedValue(undefined)
})

// ── Testes ─────────────────────────────────────────────────────────────────────

describe('respondInviteService', () => {
  describe('aceitar convite (ACCEPT)', () => {
    it('deve atualizar o status do convite para ACCEPTED', async () => {
      await respondInviteService(ACCEPT_INPUT)

      expect(vi.mocked(updateInviteStatus)).toHaveBeenCalledWith(INVITE_ID, 'ACCEPTED')
    })

    it('deve adicionar o usuário como MEMBER quando role é COMMON', async () => {
      await respondInviteService(ACCEPT_INPUT)

      expect(vi.mocked(addMember)).toHaveBeenCalledWith(
        expect.objectContaining({ organizationId: ORG_ID, userId: USER_ID, role: 'MEMBER' }),
      )
    })

    it('deve adicionar o usuário como PROFESSOR quando role é PROFESSOR', async () => {
      vi.mocked(findUserById).mockResolvedValue({ ...MOCK_USER_COMMON, role: 'PROFESSOR' })

      await respondInviteService(ACCEPT_INPUT)

      expect(vi.mocked(addMember)).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'PROFESSOR' }),
      )
    })

    it('deve adicionar o usuário como PROFESSOR quando role é ADMIN', async () => {
      vi.mocked(findUserById).mockResolvedValue({ ...MOCK_USER_COMMON, role: 'ADMIN' })

      await respondInviteService(ACCEPT_INPUT)

      expect(vi.mocked(addMember)).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'PROFESSOR' }),
      )
    })

    it('deve adicionar o usuário como MEMBER quando role é INSTITUTIONALIZED', async () => {
      vi.mocked(findUserById).mockResolvedValue({ ...MOCK_USER_COMMON, role: 'INSTITUTIONALIZED' })

      await respondInviteService(ACCEPT_INPUT)

      expect(vi.mocked(addMember)).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'MEMBER' }),
      )
    })

    it('deve verificar se o usuário já é membro antes de adicionar', async () => {
      await respondInviteService(ACCEPT_INPUT)

      expect(vi.mocked(findMembership)).toHaveBeenCalledWith(ORG_ID, USER_ID)
    })

    it('deve verificar se a org ainda está ativa ao aceitar', async () => {
      await respondInviteService(ACCEPT_INPUT)

      expect(vi.mocked(findOrgById)).toHaveBeenCalledWith(ORG_ID)
    })
  })

  describe('rejeitar convite (REJECT)', () => {
    it('deve atualizar o status do convite para REJECTED', async () => {
      await respondInviteService(REJECT_INPUT)

      expect(vi.mocked(updateInviteStatus)).toHaveBeenCalledWith(INVITE_ID, 'REJECTED')
    })

    it('não deve chamar addMember ao rejeitar', async () => {
      await respondInviteService(REJECT_INPUT)

      expect(vi.mocked(addMember)).not.toHaveBeenCalled()
    })

    it('não deve verificar org ao rejeitar', async () => {
      await respondInviteService(REJECT_INPUT)

      expect(vi.mocked(findOrgById)).not.toHaveBeenCalled()
    })
  })

  describe('erros de negócio', () => {
    it('deve lançar 404 quando o convite não existe', async () => {
      vi.mocked(findInviteById).mockResolvedValue(null)

      const error = await respondInviteService(ACCEPT_INPUT).catch(e => e)

      expect(error).toBeInstanceOf(GeneralErrorResponse)
      expect((error as GeneralErrorResponse).statusCode).toBe(404)
      expect((error as GeneralErrorResponse).code).toBe('INVITE_NOT_FOUND')
    })

    it('deve lançar 400 quando o convite não está pendente (já ACCEPTED)', async () => {
      vi.mocked(findInviteById).mockResolvedValue({ ...MOCK_INVITE, status: 'ACCEPTED' })

      const error = await respondInviteService(ACCEPT_INPUT).catch(e => e)

      expect(error).toBeInstanceOf(GeneralErrorResponse)
      expect((error as GeneralErrorResponse).statusCode).toBe(400)
      expect((error as GeneralErrorResponse).code).toBe('INVITE_NOT_PENDING')
    })

    it('deve lançar 400 quando o convite está CANCELLED', async () => {
      vi.mocked(findInviteById).mockResolvedValue({ ...MOCK_INVITE, status: 'CANCELLED' })

      const error = await respondInviteService(ACCEPT_INPUT).catch(e => e)

      expect(error).toBeInstanceOf(GeneralErrorResponse)
      expect((error as GeneralErrorResponse).statusCode).toBe(400)
    })

    it('deve lançar 403 quando userId não é o destinatário do convite', async () => {
      const error = await respondInviteService({
        inviteId: INVITE_ID,
        userId:   'ffffffff-0000-4000-8000-000000000099',
        action:   'ACCEPT',
      }).catch(e => e)

      expect(error).toBeInstanceOf(GeneralErrorResponse)
      expect((error as GeneralErrorResponse).statusCode).toBe(403)
      expect((error as GeneralErrorResponse).code).toBe('FORBIDDEN')
    })

    it('deve lançar 400 ao aceitar convite de org arquivada', async () => {
      vi.mocked(findOrgById).mockResolvedValue({ ...MOCK_ORG, status: 'ARCHIVED' })

      const error = await respondInviteService(ACCEPT_INPUT).catch(e => e)

      expect(error).toBeInstanceOf(GeneralErrorResponse)
      expect((error as GeneralErrorResponse).statusCode).toBe(400)
      expect((error as GeneralErrorResponse).code).toBe('ORG_ARCHIVED')
    })

    it('deve lançar 409 quando usuário já é membro da org', async () => {
      vi.mocked(findMembership).mockResolvedValue({ id: 'member-id', role: 'MEMBER' })

      const error = await respondInviteService(ACCEPT_INPUT).catch(e => e)

      expect(error).toBeInstanceOf(GeneralErrorResponse)
      expect((error as GeneralErrorResponse).statusCode).toBe(409)
      expect((error as GeneralErrorResponse).code).toBe('ORG_ALREADY_MEMBER')
    })

    it('não deve chamar addMember quando usuário já é membro', async () => {
      vi.mocked(findMembership).mockResolvedValue({ id: 'member-id', role: 'MEMBER' })

      await respondInviteService(ACCEPT_INPUT).catch(() => {})

      expect(vi.mocked(addMember)).not.toHaveBeenCalled()
    })
  })

  describe('validação de entrada', () => {
    it('deve lançar erro quando inviteId não é UUID válido', async () => {
      await expect(
        respondInviteService({ inviteId: 'invalido', userId: USER_ID, action: 'ACCEPT' }),
      ).rejects.toThrow()
    })

    it('deve lançar erro quando userId não é UUID válido', async () => {
      await expect(
        respondInviteService({ inviteId: INVITE_ID, userId: 'invalido', action: 'ACCEPT' }),
      ).rejects.toThrow()
    })

    it('deve lançar erro quando action é inválida', async () => {
      await expect(
        respondInviteService({ inviteId: INVITE_ID, userId: USER_ID, action: 'INVALID' }),
      ).rejects.toThrow()
    })
  })

  describe('logging de console (pino)', () => {
    it('deve logar "IN - respondInviteService"', async () => {
      await respondInviteService(ACCEPT_INPUT)

      expect(vi.mocked(logger.info)).toHaveBeenCalledWith('IN - respondInviteService')
    })

    it('deve logar OUT ao aceitar', async () => {
      await respondInviteService(ACCEPT_INPUT)

      expect(vi.mocked(logger.info)).toHaveBeenCalledWith('OUT - respondInviteService (accepted)')
    })

    it('deve logar OUT ao rejeitar', async () => {
      await respondInviteService(REJECT_INPUT)

      expect(vi.mocked(logger.info)).toHaveBeenCalledWith('OUT - respondInviteService (rejected)')
    })
  })
})
