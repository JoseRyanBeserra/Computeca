// __tests__/unit/organizations/members/removeMemberService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock('../../../../src/repositories/organizations/orgRepository', () => ({
  findOrgById: vi.fn(),
}))

vi.mock('../../../../src/repositories/organizations/orgMembersRepository', () => ({
  findMembership: vi.fn(),
  removeMember:   vi.fn(),
}))

vi.mock('../../../../src/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))

import { removeMemberService }              from '../../../../src/services/organizations/members/removeMemberService'
import { findOrgById }                      from '../../../../src/repositories/organizations/orgRepository'
import { findMembership, removeMember }     from '../../../../src/repositories/organizations/orgMembersRepository'
import { logger }                           from '../../../../src/lib/logger'
import { GeneralErrorResponse }             from '../../../../src/errors/GeneralErrorResponse'

// ── Helpers ────────────────────────────────────────────────────────────────────

const ORG_ID       = 'aaaaaaaa-0000-4000-8000-000000000001'
const REQUESTER_ID = 'bbbbbbbb-0000-4000-8000-000000000002'
const TARGET_ID    = 'cccccccc-0000-4000-8000-000000000003'

const MOCK_ORG = {
  id:          ORG_ID,
  name:        'Projeto Alpha',
  description: null,
  status:      'ACTIVE',
  createdById: REQUESTER_ID,
  createdAt:   new Date('2026-01-01'),
  updatedAt:   new Date('2026-01-01'),
}

const VALID_INPUT = { orgId: ORG_ID, targetUserId: TARGET_ID, requestingUserId: REQUESTER_ID }

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()

  vi.mocked(findOrgById).mockResolvedValue(MOCK_ORG)
  // findMembership é chamado duas vezes: requester depois target
  vi.mocked(findMembership).mockImplementation(async (_orgId, userId) => {
    if (userId === REQUESTER_ID) return { id: 'req-member', role: 'ADMIN' }
    if (userId === TARGET_ID)    return { id: 'tgt-member', role: 'MEMBER' }
    return null
  })
  vi.mocked(removeMember).mockResolvedValue(undefined)
})

// ── Testes ─────────────────────────────────────────────────────────────────────

describe('removeMemberService', () => {
  describe('remoção de membro (fluxo de sucesso)', () => {
    it('deve remover o membro com orgId e targetUserId corretos', async () => {
      await removeMemberService(VALID_INPUT)

      expect(vi.mocked(removeMember)).toHaveBeenCalledWith(ORG_ID, TARGET_ID)
    })

    it('deve verificar se a organização existe', async () => {
      await removeMemberService(VALID_INPUT)

      expect(vi.mocked(findOrgById)).toHaveBeenCalledWith(ORG_ID)
    })

    it('deve verificar a membership do solicitante (requester primeiro)', async () => {
      await removeMemberService(VALID_INPUT)

      expect(vi.mocked(findMembership)).toHaveBeenNthCalledWith(1, ORG_ID, REQUESTER_ID)
    })

    it('deve verificar a membership do target (após requester)', async () => {
      await removeMemberService(VALID_INPUT)

      expect(vi.mocked(findMembership)).toHaveBeenNthCalledWith(2, ORG_ID, TARGET_ID)
    })

    it('deve funcionar removendo um PROFESSOR', async () => {
      vi.mocked(findMembership).mockImplementation(async (_orgId, userId) => {
        if (userId === REQUESTER_ID) return { id: 'req-member', role: 'ADMIN' }
        if (userId === TARGET_ID)    return { id: 'tgt-member', role: 'PROFESSOR' }
        return null
      })

      await removeMemberService(VALID_INPUT)

      expect(vi.mocked(removeMember)).toHaveBeenCalledWith(ORG_ID, TARGET_ID)
    })
  })

  describe('erros de negócio', () => {
    it('deve lançar 404 quando a organização não existe', async () => {
      vi.mocked(findOrgById).mockResolvedValue(null)

      const error = await removeMemberService(VALID_INPUT).catch(e => e)

      expect(error).toBeInstanceOf(GeneralErrorResponse)
      expect((error as GeneralErrorResponse).statusCode).toBe(404)
      expect((error as GeneralErrorResponse).code).toBe('ORG_NOT_FOUND')
    })

    it('deve lançar 400 quando a organização está arquivada', async () => {
      vi.mocked(findOrgById).mockResolvedValue({ ...MOCK_ORG, status: 'ARCHIVED' })

      const error = await removeMemberService(VALID_INPUT).catch(e => e)

      expect(error).toBeInstanceOf(GeneralErrorResponse)
      expect((error as GeneralErrorResponse).statusCode).toBe(400)
      expect((error as GeneralErrorResponse).code).toBe('ORG_ARCHIVED')
    })

    it('deve lançar 403 quando solicitante não é ADMIN da org', async () => {
      vi.mocked(findMembership).mockImplementation(async (_orgId, userId) => {
        if (userId === REQUESTER_ID) return { id: 'req-member', role: 'PROFESSOR' }
        return null
      })

      const error = await removeMemberService(VALID_INPUT).catch(e => e)

      expect(error).toBeInstanceOf(GeneralErrorResponse)
      expect((error as GeneralErrorResponse).statusCode).toBe(403)
      expect((error as GeneralErrorResponse).code).toBe('ORG_NOT_STAFF')
    })

    it('deve lançar 403 quando solicitante não é membro (null)', async () => {
      vi.mocked(findMembership).mockResolvedValue(null)

      const error = await removeMemberService(VALID_INPUT).catch(e => e)

      expect(error).toBeInstanceOf(GeneralErrorResponse)
      expect((error as GeneralErrorResponse).statusCode).toBe(403)
    })

    it('deve lançar 404 quando target não é membro da org', async () => {
      vi.mocked(findMembership).mockImplementation(async (_orgId, userId) => {
        if (userId === REQUESTER_ID) return { id: 'req-member', role: 'ADMIN' }
        return null // target not member
      })

      const error = await removeMemberService(VALID_INPUT).catch(e => e)

      expect(error).toBeInstanceOf(GeneralErrorResponse)
      expect((error as GeneralErrorResponse).statusCode).toBe(404)
      expect((error as GeneralErrorResponse).code).toBe('ORG_NOT_MEMBER')
    })

    it('deve lançar 403 quando target é ADMIN (não pode ser removido)', async () => {
      vi.mocked(findMembership).mockImplementation(async (_orgId, userId) => {
        if (userId === REQUESTER_ID) return { id: 'req-member', role: 'ADMIN' }
        if (userId === TARGET_ID)    return { id: 'tgt-member', role: 'ADMIN' }
        return null
      })

      const error = await removeMemberService(VALID_INPUT).catch(e => e)

      expect(error).toBeInstanceOf(GeneralErrorResponse)
      expect((error as GeneralErrorResponse).statusCode).toBe(403)
      expect((error as GeneralErrorResponse).code).toBe('ORG_NOT_STAFF')
    })

    it('não deve chamar removeMember quando org não existe', async () => {
      vi.mocked(findOrgById).mockResolvedValue(null)

      await removeMemberService(VALID_INPUT).catch(() => {})

      expect(vi.mocked(removeMember)).not.toHaveBeenCalled()
    })

    it('não deve chamar removeMember quando solicitante não é ADMIN', async () => {
      vi.mocked(findMembership).mockImplementation(async (_orgId, userId) => {
        if (userId === REQUESTER_ID) return { id: 'req-member', role: 'MEMBER' }
        return null
      })

      await removeMemberService(VALID_INPUT).catch(() => {})

      expect(vi.mocked(removeMember)).not.toHaveBeenCalled()
    })

    it('não deve chamar removeMember quando target é ADMIN', async () => {
      vi.mocked(findMembership).mockImplementation(async (_orgId, userId) => {
        if (userId === REQUESTER_ID) return { id: 'req-member', role: 'ADMIN' }
        if (userId === TARGET_ID)    return { id: 'tgt-member', role: 'ADMIN' }
        return null
      })

      await removeMemberService(VALID_INPUT).catch(() => {})

      expect(vi.mocked(removeMember)).not.toHaveBeenCalled()
    })
  })

  describe('validação de entrada', () => {
    it('deve lançar erro quando orgId não é UUID válido', async () => {
      await expect(
        removeMemberService({ orgId: 'invalido', targetUserId: TARGET_ID, requestingUserId: REQUESTER_ID }),
      ).rejects.toThrow()
    })

    it('deve lançar erro quando targetUserId não é UUID válido', async () => {
      await expect(
        removeMemberService({ orgId: ORG_ID, targetUserId: 'invalido', requestingUserId: REQUESTER_ID }),
      ).rejects.toThrow()
    })

    it('deve lançar erro quando requestingUserId não é UUID válido', async () => {
      await expect(
        removeMemberService({ orgId: ORG_ID, targetUserId: TARGET_ID, requestingUserId: 'invalido' }),
      ).rejects.toThrow()
    })
  })

  describe('logging de console (pino)', () => {
    it('deve logar "IN - removeMemberService"', async () => {
      await removeMemberService(VALID_INPUT)

      expect(vi.mocked(logger.info)).toHaveBeenCalledWith('IN - removeMemberService')
    })

    it('deve logar "OUT - removeMemberService"', async () => {
      await removeMemberService(VALID_INPUT)

      expect(vi.mocked(logger.info)).toHaveBeenCalledWith('OUT - removeMemberService')
    })
  })
})
