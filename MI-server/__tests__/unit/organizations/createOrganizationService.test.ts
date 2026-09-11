// __tests__/unit/organizations/createOrganizationService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock('../../../src/database/prisma', () => ({
  prisma: {
    $transaction: vi.fn(),
  },
}))

vi.mock('../../../src/repositories/audit/auditRepository', () => ({
  createAuditLog: vi.fn(),
}))

vi.mock('../../../src/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))

import { createOrganizationService } from '../../../src/services/organizations/createOrganizationService'
import { prisma }                    from '../../../src/database/prisma'
import { createAuditLog }            from '../../../src/repositories/audit/auditRepository'
import { logger }                    from '../../../src/lib/logger'

// ── Helpers ────────────────────────────────────────────────────────────────────

const ORG_ID  = 'aaaaaaaa-0000-4000-8000-000000000001'
const USER_ID = 'bbbbbbbb-0000-4000-8000-000000000002'

const MOCK_ORG = {
  id:          ORG_ID,
  name:        'Projeto de Extensão',
  description: 'Descrição do projeto',
  status:      'ACTIVE',
  createdById: USER_ID,
  createdAt:   new Date('2026-01-01'),
  updatedAt:   new Date('2026-01-01'),
}

const VALID_INPUT = { name: 'Projeto de Extensão', description: 'Descrição do projeto', createdById: USER_ID }

let orgCreate:    ReturnType<typeof vi.fn>
let memberCreate: ReturnType<typeof vi.fn>

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()

  orgCreate    = vi.fn().mockResolvedValue(MOCK_ORG)
  memberCreate = vi.fn().mockResolvedValue({})

  const mockTx = {
    organization:       { create: orgCreate },
    organizationMember: { create: memberCreate },
  };

  (vi.mocked(prisma.$transaction) as any).mockImplementation((fn: any) => fn(mockTx))
  vi.mocked(createAuditLog).mockResolvedValue(undefined)
})

// ── Testes ─────────────────────────────────────────────────────────────────────

describe('createOrganizationService', () => {
  describe('criação de organização (fluxo de sucesso)', () => {
    it('deve criar a organização dentro de uma transação', async () => {
      await createOrganizationService(VALID_INPUT)

      expect(vi.mocked(prisma.$transaction)).toHaveBeenCalledOnce()
    })

    it('deve criar a organização com name, description e createdById corretos', async () => {
      await createOrganizationService(VALID_INPUT)

      expect(orgCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name:        'Projeto de Extensão',
            description: 'Descrição do projeto',
            createdById: USER_ID,
          }),
        }),
      )
    })

    it('deve adicionar o criador como membro ADMIN dentro da mesma transação', async () => {
      await createOrganizationService(VALID_INPUT)

      expect(memberCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: ORG_ID,
            userId:         USER_ID,
            role:           'ADMIN',
          }),
        }),
      )
    })

    it('deve retornar a organização criada', async () => {
      const result = await createOrganizationService(VALID_INPUT)

      expect(result).toMatchObject({
        id:          ORG_ID,
        name:        'Projeto de Extensão',
        status:      'ACTIVE',
        createdById: USER_ID,
      })
    })

    it('deve funcionar sem descrição (campo opcional)', async () => {
      orgCreate.mockResolvedValue({ ...MOCK_ORG, description: null })

      const result = await createOrganizationService({ name: 'Sem Desc', createdById: USER_ID })

      expect(result).toBeDefined()
      expect(orgCreate).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ name: 'Sem Desc' }) }),
      )
    })
  })

  describe('auditoria (RNF05)', () => {
    it('deve registrar AuditLog com action ORGANIZATION_CREATED', async () => {
      await createOrganizationService(VALID_INPUT)

      expect(vi.mocked(createAuditLog)).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'ORGANIZATION_CREATED' }),
      )
    })

    it('deve registrar AuditLog com actorId do criador', async () => {
      await createOrganizationService(VALID_INPUT)

      expect(vi.mocked(createAuditLog)).toHaveBeenCalledWith(
        expect.objectContaining({ actorId: USER_ID }),
      )
    })

    it('deve registrar AuditLog com targetId da organização criada', async () => {
      await createOrganizationService(VALID_INPUT)

      expect(vi.mocked(createAuditLog)).toHaveBeenCalledWith(
        expect.objectContaining({ targetId: ORG_ID }),
      )
    })

    it('deve incluir o nome da org no metadata do AuditLog', async () => {
      await createOrganizationService(VALID_INPUT)

      expect(vi.mocked(createAuditLog)).toHaveBeenCalledWith(
        expect.objectContaining({ metadata: { name: 'Projeto de Extensão' } }),
      )
    })

    it('deve registrar o AuditLog após concluir a transação', async () => {
      const order: string[] = []

      ;(vi.mocked(prisma.$transaction) as any).mockImplementation(async (fn: any) => {
        const result = await fn({ organization: { create: orgCreate }, organizationMember: { create: memberCreate } })
        order.push('transaction')
        return result
      })
      vi.mocked(createAuditLog).mockImplementation(async () => { order.push('auditLog') })

      await createOrganizationService(VALID_INPUT)

      expect(order.indexOf('transaction')).toBeLessThan(order.indexOf('auditLog'))
    })
  })

  describe('validação de entrada', () => {
    it('deve lançar erro quando name está ausente', async () => {
      await expect(createOrganizationService({ createdById: USER_ID })).rejects.toThrow()
    })

    it('deve lançar erro quando name é muito curto (menos de 2 chars)', async () => {
      await expect(
        createOrganizationService({ name: 'A', createdById: USER_ID }),
      ).rejects.toThrow()
    })

    it('deve lançar erro quando createdById não é UUID válido', async () => {
      await expect(
        createOrganizationService({ name: 'Org Válida', createdById: 'nao-e-uuid' }),
      ).rejects.toThrow()
    })

    it('deve lançar erro quando createdById está ausente', async () => {
      await expect(createOrganizationService({ name: 'Org Válida' })).rejects.toThrow()
    })

    it('não deve chamar a transação quando a validação falha', async () => {
      await createOrganizationService({ createdById: USER_ID }).catch(() => {})

      expect(vi.mocked(prisma.$transaction)).not.toHaveBeenCalled()
    })
  })

  describe('logging de console (pino)', () => {
    it('deve logar "IN - createOrganizationService"', async () => {
      await createOrganizationService(VALID_INPUT)

      expect(vi.mocked(logger.info)).toHaveBeenCalledWith('IN - createOrganizationService')
    })

    it('deve logar "OUT - createOrganizationService"', async () => {
      await createOrganizationService(VALID_INPUT)

      expect(vi.mocked(logger.info)).toHaveBeenCalledWith('OUT - createOrganizationService')
    })

    it('deve logar IN antes de OUT', async () => {
      await createOrganizationService(VALID_INPUT)

      const calls = vi.mocked(logger.info).mock.calls.map(c => c[0])
      expect(calls.indexOf('IN - createOrganizationService')).toBeLessThan(
        calls.indexOf('OUT - createOrganizationService'),
      )
    })
  })
})
