// __tests__/unit/organizations/members/leaveOrganizationService.test.ts
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

import { leaveOrganizationService }         from '../../../../src/services/organizations/members/leaveOrganizationService'
import { findOrgById }                      from '../../../../src/repositories/organizations/orgRepository'
import { findMembership, removeMember }     from '../../../../src/repositories/organizations/orgMembersRepository'
import { logger }                           from '../../../../src/lib/logger'
import { GeneralErrorResponse }             from '../../../../src/errors/GeneralErrorResponse'

// ── Helpers ────────────────────────────────────────────────────────────────────

const ORG_ID  = 'aaaaaaaa-0000-4000-8000-000000000001'
const USER_ID = 'bbbbbbbb-0000-4000-8000-000000000002'

const MOCK_ORG = {
  id:          ORG_ID,
  name:        'Projeto Alpha',
  description: null,
  status:      'ACTIVE',
  createdById: 'cccccccc-0000-4000-8000-000000000003',
  createdAt:   new Date('2026-01-01'),
  updatedAt:   new Date('2026-01-01'),
}

const VALID_INPUT = { orgId: ORG_ID, userId: USER_ID }

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()

  vi.mocked(findOrgById).mockResolvedValue(MOCK_ORG)
  vi.mocked(findMembership).mockResolvedValue({ id: 'mem-001', role: 'MEMBER' })
  vi.mocked(removeMember).mockResolvedValue(undefined)
})

// ── Testes ─────────────────────────────────────────────────────────────────────

describe('leaveOrganizationService', () => {
  describe('saída de organização (fluxo de sucesso)', () => {
    it('deve remover o membro com orgId e userId corretos', async () => {
      await leaveOrganizationService(VALID_INPUT)

      expect(vi.mocked(removeMember)).toHaveBeenCalledWith(ORG_ID, USER_ID)
    })

    it('deve verificar a existência da organização', async () => {
      await leaveOrganizationService(VALID_INPUT)

      expect(vi.mocked(findOrgById)).toHaveBeenCalledWith(ORG_ID)
    })

    it('deve verificar se o usuário é membro antes de remover', async () => {
      await leaveOrganizationService(VALID_INPUT)

      expect(vi.mocked(findMembership)).toHaveBeenCalledWith(ORG_ID, USER_ID)
    })

    it('deve funcionar para PROFESSOR saindo da org', async () => {
      vi.mocked(findMembership).mockResolvedValue({ id: 'mem-001', role: 'PROFESSOR' })

      await leaveOrganizationService(VALID_INPUT)

      expect(vi.mocked(removeMember)).toHaveBeenCalledWith(ORG_ID, USER_ID)
    })
  })

  describe('erros de negócio', () => {
    it('deve lançar 404 quando a organização não existe', async () => {
      vi.mocked(findOrgById).mockResolvedValue(null)

      const error = await leaveOrganizationService(VALID_INPUT).catch(e => e)

      expect(error).toBeInstanceOf(GeneralErrorResponse)
      expect((error as GeneralErrorResponse).statusCode).toBe(404)
      expect((error as GeneralErrorResponse).code).toBe('ORG_NOT_FOUND')
    })

    it('deve lançar 404 quando o usuário não é membro da org', async () => {
      vi.mocked(findMembership).mockResolvedValue(null)

      const error = await leaveOrganizationService(VALID_INPUT).catch(e => e)

      expect(error).toBeInstanceOf(GeneralErrorResponse)
      expect((error as GeneralErrorResponse).statusCode).toBe(404)
      expect((error as GeneralErrorResponse).code).toBe('ORG_NOT_MEMBER')
    })

    it('deve lançar 403 quando o usuário é ADMIN da org (não pode sair)', async () => {
      vi.mocked(findMembership).mockResolvedValue({ id: 'mem-001', role: 'ADMIN' })

      const error = await leaveOrganizationService(VALID_INPUT).catch(e => e)

      expect(error).toBeInstanceOf(GeneralErrorResponse)
      expect((error as GeneralErrorResponse).statusCode).toBe(403)
      expect((error as GeneralErrorResponse).code).toBe('ORG_NOT_STAFF')
    })

    it('não deve chamar removeMember quando org não existe', async () => {
      vi.mocked(findOrgById).mockResolvedValue(null)

      await leaveOrganizationService(VALID_INPUT).catch(() => {})

      expect(vi.mocked(removeMember)).not.toHaveBeenCalled()
    })

    it('não deve chamar removeMember quando usuário não é membro', async () => {
      vi.mocked(findMembership).mockResolvedValue(null)

      await leaveOrganizationService(VALID_INPUT).catch(() => {})

      expect(vi.mocked(removeMember)).not.toHaveBeenCalled()
    })

    it('não deve chamar removeMember quando usuário é ADMIN', async () => {
      vi.mocked(findMembership).mockResolvedValue({ id: 'mem-001', role: 'ADMIN' })

      await leaveOrganizationService(VALID_INPUT).catch(() => {})

      expect(vi.mocked(removeMember)).not.toHaveBeenCalled()
    })
  })

  describe('validação de entrada', () => {
    it('deve lançar erro quando orgId não é UUID válido', async () => {
      await expect(
        leaveOrganizationService({ orgId: 'invalido', userId: USER_ID }),
      ).rejects.toThrow()
    })

    it('deve lançar erro quando userId não é UUID válido', async () => {
      await expect(
        leaveOrganizationService({ orgId: ORG_ID, userId: 'invalido' }),
      ).rejects.toThrow()
    })
  })

  describe('logging de console (pino)', () => {
    it('deve logar "IN - leaveOrganizationService"', async () => {
      await leaveOrganizationService(VALID_INPUT)

      expect(vi.mocked(logger.info)).toHaveBeenCalledWith('IN - leaveOrganizationService')
    })

    it('deve logar "OUT - leaveOrganizationService"', async () => {
      await leaveOrganizationService(VALID_INPUT)

      expect(vi.mocked(logger.info)).toHaveBeenCalledWith('OUT - leaveOrganizationService')
    })
  })
})
