// __tests__/unit/organizations/members/listOrgMembersService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock('../../../../src/repositories/organizations/orgRepository', () => ({
  findOrgById: vi.fn(),
}))

vi.mock('../../../../src/repositories/organizations/orgMembersRepository', () => ({
  findMembership: vi.fn(),
  listMembers:    vi.fn(),
}))

vi.mock('../../../../src/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))

import { listOrgMembersService }    from '../../../../src/services/organizations/members/listOrgMembersService'
import { findOrgById }              from '../../../../src/repositories/organizations/orgRepository'
import { findMembership, listMembers } from '../../../../src/repositories/organizations/orgMembersRepository'
import { logger }                   from '../../../../src/lib/logger'
import { GeneralErrorResponse }     from '../../../../src/errors/GeneralErrorResponse'

// ── Helpers ────────────────────────────────────────────────────────────────────

const ORG_ID      = 'aaaaaaaa-0000-4000-8000-000000000001'
const REQUESTER_ID = 'bbbbbbbb-0000-4000-8000-000000000002'

const MOCK_ORG = {
  id:          ORG_ID,
  name:        'Projeto Alpha',
  description: null,
  status:      'ACTIVE',
  createdById: REQUESTER_ID,
  createdAt:   new Date('2026-01-01'),
  updatedAt:   new Date('2026-01-01'),
}

const MOCK_MEMBERS = [
  {
    id:             'mem-001',
    organizationId: ORG_ID,
    userId:         REQUESTER_ID,
    role:           'ADMIN',
    joinedAt:       new Date('2026-01-01'),
    user:           { name: 'Admin User', email: 'admin@test.com' },
  },
  {
    id:             'mem-002',
    organizationId: ORG_ID,
    userId:         'cccccccc-0000-4000-8000-000000000003',
    role:           'MEMBER',
    joinedAt:       new Date('2026-02-01'),
    user:           { name: 'Common User', email: 'common@test.com' },
  },
]

const VALID_INPUT = { orgId: ORG_ID, requestingUserId: REQUESTER_ID }

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()

  vi.mocked(findOrgById).mockResolvedValue(MOCK_ORG)
  vi.mocked(findMembership).mockResolvedValue({ id: 'mem-001', role: 'ADMIN' })
  vi.mocked(listMembers).mockResolvedValue(MOCK_MEMBERS)
})

// ── Testes ─────────────────────────────────────────────────────────────────────

describe('listOrgMembersService', () => {
  describe('listagem de membros (fluxo de sucesso)', () => {
    it('deve retornar a lista de membros da organização', async () => {
      const result = await listOrgMembersService(VALID_INPUT)

      expect(result).toHaveLength(2)
    })

    it('deve chamar listMembers com o orgId correto', async () => {
      await listOrgMembersService(VALID_INPUT)

      expect(vi.mocked(listMembers)).toHaveBeenCalledWith(ORG_ID)
    })

    it('deve verificar se a organização existe', async () => {
      await listOrgMembersService(VALID_INPUT)

      expect(vi.mocked(findOrgById)).toHaveBeenCalledWith(ORG_ID)
    })

    it('deve verificar se o solicitante é membro da org', async () => {
      await listOrgMembersService(VALID_INPUT)

      expect(vi.mocked(findMembership)).toHaveBeenCalledWith(ORG_ID, REQUESTER_ID)
    })

    it('deve funcionar para qualquer role de membro (MEMBER pode listar)', async () => {
      vi.mocked(findMembership).mockResolvedValue({ id: 'mem-001', role: 'MEMBER' })

      const result = await listOrgMembersService(VALID_INPUT)

      expect(result).toHaveLength(2)
    })

    it('deve incluir dados do usuário em cada membro', async () => {
      const result = await listOrgMembersService(VALID_INPUT)

      expect(result[0].user).toMatchObject({ name: 'Admin User', email: 'admin@test.com' })
    })
  })

  describe('erros de negócio', () => {
    it('deve lançar 404 quando a organização não existe', async () => {
      vi.mocked(findOrgById).mockResolvedValue(null)

      const error = await listOrgMembersService(VALID_INPUT).catch(e => e)

      expect(error).toBeInstanceOf(GeneralErrorResponse)
      expect((error as GeneralErrorResponse).statusCode).toBe(404)
      expect((error as GeneralErrorResponse).code).toBe('ORG_NOT_FOUND')
    })

    it('deve lançar 403 quando solicitante não é membro da org', async () => {
      vi.mocked(findMembership).mockResolvedValue(null)

      const error = await listOrgMembersService(VALID_INPUT).catch(e => e)

      expect(error).toBeInstanceOf(GeneralErrorResponse)
      expect((error as GeneralErrorResponse).statusCode).toBe(403)
      expect((error as GeneralErrorResponse).code).toBe('ORG_NOT_MEMBER')
    })

    it('não deve chamar listMembers quando org não existe', async () => {
      vi.mocked(findOrgById).mockResolvedValue(null)

      await listOrgMembersService(VALID_INPUT).catch(() => {})

      expect(vi.mocked(listMembers)).not.toHaveBeenCalled()
    })

    it('não deve chamar listMembers quando não autorizado', async () => {
      vi.mocked(findMembership).mockResolvedValue(null)

      await listOrgMembersService(VALID_INPUT).catch(() => {})

      expect(vi.mocked(listMembers)).not.toHaveBeenCalled()
    })
  })

  describe('validação de entrada', () => {
    it('deve lançar erro quando orgId não é UUID válido', async () => {
      await expect(
        listOrgMembersService({ orgId: 'invalido', requestingUserId: REQUESTER_ID }),
      ).rejects.toThrow()
    })

    it('deve lançar erro quando requestingUserId não é UUID válido', async () => {
      await expect(
        listOrgMembersService({ orgId: ORG_ID, requestingUserId: 'invalido' }),
      ).rejects.toThrow()
    })
  })

  describe('logging de console (pino)', () => {
    it('deve logar "IN - listOrgMembersService"', async () => {
      await listOrgMembersService(VALID_INPUT)

      expect(vi.mocked(logger.info)).toHaveBeenCalledWith('IN - listOrgMembersService')
    })

    it('deve logar "OUT - listOrgMembersService"', async () => {
      await listOrgMembersService(VALID_INPUT)

      expect(vi.mocked(logger.info)).toHaveBeenCalledWith('OUT - listOrgMembersService')
    })
  })
})
