// __tests__/unit/organizations/listMyOrganizationsService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock('../../../src/repositories/organizations/orgRepository', () => ({
  listMyOrgs: vi.fn(),
}))

vi.mock('../../../src/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))

import { listMyOrganizationsService } from '../../../src/services/organizations/listMyOrganizationsService'
import { listMyOrgs }                 from '../../../src/repositories/organizations/orgRepository'
import { logger }                     from '../../../src/lib/logger'

// ── Helpers ────────────────────────────────────────────────────────────────────

const USER_ID = 'bbbbbbbb-0000-4000-8000-000000000002'

const MOCK_ORGS = [
  {
    id:          'aaaaaaaa-0000-4000-8000-000000000001',
    name:        'Projeto Alpha',
    description: null,
    status:      'ACTIVE',
    myRole:      'ADMIN',
    memberCount: 3,
    createdAt:   new Date('2026-01-01'),
  },
  {
    id:          'cccccccc-0000-4000-8000-000000000003',
    name:        'Projeto Beta',
    description: 'Descrição',
    status:      'ACTIVE',
    myRole:      'MEMBER',
    memberCount: 5,
    createdAt:   new Date('2026-02-01'),
  },
]

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(listMyOrgs).mockResolvedValue(MOCK_ORGS)
})

// ── Testes ─────────────────────────────────────────────────────────────────────

describe('listMyOrganizationsService', () => {
  describe('listagem (fluxo de sucesso)', () => {
    it('deve chamar listMyOrgs com o userId correto', async () => {
      await listMyOrganizationsService({ userId: USER_ID })

      expect(vi.mocked(listMyOrgs)).toHaveBeenCalledWith(USER_ID)
    })

    it('deve retornar a lista de organizações do usuário', async () => {
      const result = await listMyOrganizationsService({ userId: USER_ID })

      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('Projeto Alpha')
    })

    it('deve retornar lista vazia quando usuário não pertence a nenhuma org', async () => {
      vi.mocked(listMyOrgs).mockResolvedValue([])

      const result = await listMyOrganizationsService({ userId: USER_ID })

      expect(result).toEqual([])
    })

    it('deve retornar o myRole correto para cada organização', async () => {
      const result = await listMyOrganizationsService({ userId: USER_ID })

      expect(result[0].myRole).toBe('ADMIN')
      expect(result[1].myRole).toBe('MEMBER')
    })

    it('deve retornar o memberCount de cada organização', async () => {
      const result = await listMyOrganizationsService({ userId: USER_ID })

      expect(result[0].memberCount).toBe(3)
      expect(result[1].memberCount).toBe(5)
    })
  })

  describe('validação de entrada', () => {
    it('deve lançar erro quando userId não é UUID válido', async () => {
      await expect(
        listMyOrganizationsService({ userId: 'nao-e-uuid' }),
      ).rejects.toThrow()
    })

    it('deve lançar erro quando userId está ausente', async () => {
      await expect(listMyOrganizationsService({})).rejects.toThrow()
    })

    it('não deve chamar listMyOrgs quando a validação falha', async () => {
      await listMyOrganizationsService({ userId: 'invalido' }).catch(() => {})

      expect(vi.mocked(listMyOrgs)).not.toHaveBeenCalled()
    })
  })

  describe('logging de console (pino)', () => {
    it('deve logar "IN - listMyOrganizationsService"', async () => {
      await listMyOrganizationsService({ userId: USER_ID })

      expect(vi.mocked(logger.info)).toHaveBeenCalledWith('IN - listMyOrganizationsService')
    })

    it('deve logar "OUT - listMyOrganizationsService"', async () => {
      await listMyOrganizationsService({ userId: USER_ID })

      expect(vi.mocked(logger.info)).toHaveBeenCalledWith('OUT - listMyOrganizationsService')
    })
  })
})
