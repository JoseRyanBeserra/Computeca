// __tests__/unit/organizations/invites/inviteUserService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock('../../../../src/repositories/organizations/orgRepository', () => ({
  findOrgById: vi.fn(),
}))

vi.mock('../../../../src/repositories/organizations/orgMembersRepository', () => ({
  findMembership: vi.fn(),
}))

vi.mock('../../../../src/repositories/organizations/orgInvitesRepository', () => ({
  findPendingInvite: vi.fn(),
  createInvite:      vi.fn(),
}))

vi.mock('../../../../src/repositories/users/usersRepository', () => ({
  findUserByEmail: vi.fn(),
}))

vi.mock('../../../../src/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))

import { inviteUserService }                    from '../../../../src/services/organizations/invites/inviteUserService'
import { findOrgById }                          from '../../../../src/repositories/organizations/orgRepository'
import { findMembership }                       from '../../../../src/repositories/organizations/orgMembersRepository'
import { findPendingInvite, createInvite }      from '../../../../src/repositories/organizations/orgInvitesRepository'
import { findUserByEmail }                      from '../../../../src/repositories/users/usersRepository'
import { logger }                               from '../../../../src/lib/logger'
import { GeneralErrorResponse }                 from '../../../../src/errors/GeneralErrorResponse'

// ── Helpers ────────────────────────────────────────────────────────────────────

const ORG_ID     = 'aaaaaaaa-0000-4000-8000-000000000001'
const INVITER_ID = 'bbbbbbbb-0000-4000-8000-000000000002'
const INVITEE_ID = 'cccccccc-0000-4000-8000-000000000003'

const MOCK_ORG = {
  id:          ORG_ID,
  name:        'Projeto Alpha',
  description: null,
  status:      'ACTIVE',
  createdById: INVITER_ID,
  createdAt:   new Date('2026-01-01'),
  updatedAt:   new Date('2026-01-01'),
}

const MOCK_INVITEE = {
  id:            INVITEE_ID,
  name:          'Ana Professora',
  email:         'ana@dcx.ufpb.br',
  role:          'INSTITUTIONALIZED',
  canUpload:     false,
  emailVerified: true,
  suspended:     false,
  createdAt:     new Date('2026-01-01'),
  updatedAt:     new Date('2026-01-01'),
}

const MOCK_INVITE = {
  id:             'invite-uuid-001',
  organizationId: ORG_ID,
  invitedUserId:  INVITEE_ID,
  invitedById:    INVITER_ID,
  status:         'PENDING',
  createdAt:      new Date('2026-01-01'),
  respondedAt:    null,
  organization:   { name: 'Projeto Alpha' },
  invitedBy:      { name: 'Usuário Admin' },
}

const VALID_INPUT = {
  orgId:        ORG_ID,
  invitedEmail: 'ana@dcx.ufpb.br',
  invitedById:  INVITER_ID,
}

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()

  vi.mocked(findOrgById).mockResolvedValue(MOCK_ORG)
  // findMembership is called twice: first for inviter, then for invitee (already-member check)
  vi.mocked(findMembership).mockImplementation(async (_orgId, userId) => {
    if (userId === INVITER_ID) return { id: 'inviter-member', role: 'ADMIN' }
    return null // invitee is not yet a member
  })
  vi.mocked(findUserByEmail).mockResolvedValue(MOCK_INVITEE)
  vi.mocked(findPendingInvite).mockResolvedValue(null)
  vi.mocked(createInvite).mockResolvedValue(MOCK_INVITE)
})

// ── Testes ─────────────────────────────────────────────────────────────────────

describe('inviteUserService', () => {
  describe('convite de usuário (fluxo de sucesso)', () => {
    it('deve criar o convite com os parâmetros corretos', async () => {
      await inviteUserService(VALID_INPUT)

      expect(vi.mocked(createInvite)).toHaveBeenCalledWith({
        organizationId: ORG_ID,
        invitedUserId:  INVITEE_ID,
        invitedById:    INVITER_ID,
      })
    })

    it('deve retornar o convite criado', async () => {
      const result = await inviteUserService(VALID_INPUT)

      expect(result).toMatchObject({
        id:             'invite-uuid-001',
        organizationId: ORG_ID,
        status:         'PENDING',
      })
    })

    it('deve verificar a organização antes de criar o convite', async () => {
      await inviteUserService(VALID_INPUT)

      expect(vi.mocked(findOrgById)).toHaveBeenCalledWith(ORG_ID)
    })

    it('deve verificar a membership do convidador', async () => {
      await inviteUserService(VALID_INPUT)

      expect(vi.mocked(findMembership)).toHaveBeenCalledWith(ORG_ID, INVITER_ID)
    })

    it('deve verificar se já há convite pendente para o usuário', async () => {
      await inviteUserService(VALID_INPUT)

      expect(vi.mocked(findPendingInvite)).toHaveBeenCalledWith(ORG_ID, INVITEE_ID)
    })

    it('deve aceitar convidador com role PROFESSOR da org', async () => {
      vi.mocked(findMembership).mockImplementation(async (_orgId, userId) => {
        if (userId === INVITER_ID) return { id: 'member-id', role: 'PROFESSOR' }
        return null
      })

      await inviteUserService(VALID_INPUT)

      expect(vi.mocked(createInvite)).toHaveBeenCalled()
    })
  })

  describe('erros de negócio', () => {
    it('deve lançar 404 quando a organização não existe', async () => {
      vi.mocked(findOrgById).mockResolvedValue(null)

      const error = await inviteUserService(VALID_INPUT).catch(e => e)

      expect(error).toBeInstanceOf(GeneralErrorResponse)
      expect((error as GeneralErrorResponse).statusCode).toBe(404)
      expect((error as GeneralErrorResponse).code).toBe('ORG_NOT_FOUND')
    })

    it('deve lançar 400 quando a organização está arquivada', async () => {
      vi.mocked(findOrgById).mockResolvedValue({ ...MOCK_ORG, status: 'ARCHIVED' })

      const error = await inviteUserService(VALID_INPUT).catch(e => e)

      expect(error).toBeInstanceOf(GeneralErrorResponse)
      expect((error as GeneralErrorResponse).statusCode).toBe(400)
      expect((error as GeneralErrorResponse).code).toBe('ORG_ARCHIVED')
    })

    it('deve lançar 403 quando convidador não é membro da org', async () => {
      vi.mocked(findMembership).mockResolvedValue(null)

      const error = await inviteUserService(VALID_INPUT).catch(e => e)

      expect(error).toBeInstanceOf(GeneralErrorResponse)
      expect((error as GeneralErrorResponse).statusCode).toBe(403)
      expect((error as GeneralErrorResponse).code).toBe('ORG_NOT_STAFF')
    })

    it('deve lançar 403 quando convidador é apenas MEMBER da org', async () => {
      vi.mocked(findMembership).mockImplementation(async (_orgId, userId) => {
        if (userId === INVITER_ID) return { id: 'member-id', role: 'MEMBER' }
        return null
      })

      const error = await inviteUserService(VALID_INPUT).catch(e => e)

      expect(error).toBeInstanceOf(GeneralErrorResponse)
      expect((error as GeneralErrorResponse).statusCode).toBe(403)
      expect((error as GeneralErrorResponse).code).toBe('ORG_NOT_STAFF')
    })

    it('deve lançar 404 quando o usuário convidado não existe', async () => {
      vi.mocked(findUserByEmail).mockResolvedValue(null)

      const error = await inviteUserService(VALID_INPUT).catch(e => e)

      expect(error).toBeInstanceOf(GeneralErrorResponse)
      expect((error as GeneralErrorResponse).statusCode).toBe(404)
      expect((error as GeneralErrorResponse).code).toBe('USER_NOT_FOUND')
    })

    it('deve lançar 400 quando convidado tem role COMMON (não institucionalizado)', async () => {
      vi.mocked(findUserByEmail).mockResolvedValue({ ...MOCK_INVITEE, role: 'COMMON' })

      const error = await inviteUserService(VALID_INPUT).catch(e => e)

      expect(error).toBeInstanceOf(GeneralErrorResponse)
      expect((error as GeneralErrorResponse).statusCode).toBe(400)
      expect((error as GeneralErrorResponse).code).toBe('INVITE_ONLY_INSTITUTIONAL')
    })

    it('deve lançar 409 quando convidado já é membro da org', async () => {
      vi.mocked(findMembership).mockImplementation(async (_orgId, userId) => {
        if (userId === INVITER_ID)  return { id: 'inviter-member', role: 'ADMIN' }
        if (userId === INVITEE_ID)  return { id: 'invitee-member', role: 'MEMBER' }
        return null
      })

      const error = await inviteUserService(VALID_INPUT).catch(e => e)

      expect(error).toBeInstanceOf(GeneralErrorResponse)
      expect((error as GeneralErrorResponse).statusCode).toBe(409)
      expect((error as GeneralErrorResponse).code).toBe('ORG_ALREADY_MEMBER')
    })

    it('deve lançar 409 quando já há convite pendente para o usuário', async () => {
      vi.mocked(findMembership)
        .mockResolvedValueOnce({ id: 'inviter-member', role: 'ADMIN' })
        .mockResolvedValueOnce(null)
      vi.mocked(findPendingInvite).mockResolvedValue({ id: 'existing-invite' })

      const error = await inviteUserService(VALID_INPUT).catch(e => e)

      expect(error).toBeInstanceOf(GeneralErrorResponse)
      expect((error as GeneralErrorResponse).statusCode).toBe(409)
      expect((error as GeneralErrorResponse).code).toBe('INVITE_ALREADY_PENDING')
    })

    it('não deve chamar createInvite quando org não existe', async () => {
      vi.mocked(findOrgById).mockResolvedValue(null)

      await inviteUserService(VALID_INPUT).catch(() => {})

      expect(vi.mocked(createInvite)).not.toHaveBeenCalled()
    })

    it('não deve chamar createInvite quando convidado não é institucionalizado', async () => {
      vi.mocked(findUserByEmail).mockResolvedValue({ ...MOCK_INVITEE, role: 'COMMON' })

      await inviteUserService(VALID_INPUT).catch(() => {})

      expect(vi.mocked(createInvite)).not.toHaveBeenCalled()
    })

    it('deve aceitar PROFESSOR como usuário convidável', async () => {
      vi.mocked(findUserByEmail).mockResolvedValue({ ...MOCK_INVITEE, role: 'PROFESSOR' })
      // mockImplementation do beforeEach já garante inviter=ADMIN, invitee=null

      await inviteUserService(VALID_INPUT)

      expect(vi.mocked(createInvite)).toHaveBeenCalled()
    })

    it('deve aceitar ADMIN como usuário convidável', async () => {
      vi.mocked(findUserByEmail).mockResolvedValue({ ...MOCK_INVITEE, role: 'ADMIN' })
      // mockImplementation do beforeEach já garante inviter=ADMIN, invitee=null

      await inviteUserService(VALID_INPUT)

      expect(vi.mocked(createInvite)).toHaveBeenCalled()
    })
  })

  describe('validação de entrada', () => {
    it('deve lançar erro quando orgId não é UUID válido', async () => {
      await expect(
        inviteUserService({ orgId: 'invalido', invitedEmail: 'a@b.com', invitedById: INVITER_ID }),
      ).rejects.toThrow()
    })

    it('deve lançar erro quando invitedById não é UUID válido', async () => {
      await expect(
        inviteUserService({ orgId: ORG_ID, invitedEmail: 'a@b.com', invitedById: 'invalido' }),
      ).rejects.toThrow()
    })
  })

  describe('logging de console (pino)', () => {
    it('deve logar "IN - inviteUserService"', async () => {
      await inviteUserService(VALID_INPUT)

      expect(vi.mocked(logger.info)).toHaveBeenCalledWith('IN - inviteUserService')
    })

    it('deve logar "OUT - inviteUserService"', async () => {
      await inviteUserService(VALID_INPUT)

      expect(vi.mocked(logger.info)).toHaveBeenCalledWith('OUT - inviteUserService')
    })
  })
})
