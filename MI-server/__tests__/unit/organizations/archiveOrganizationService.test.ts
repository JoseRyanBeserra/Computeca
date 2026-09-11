// __tests__/unit/organizations/archiveOrganizationService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock('../../../src/repositories/organizations/orgRepository', () => ({
  findOrganization: vi.fn(),
  archiveOrg:       vi.fn(),
}))

vi.mock('../../../src/repositories/organizations/orgMembersRepository', () => ({
  requireMembership: vi.fn(),
}))

vi.mock('../../../src/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))

import { archiveOrganizationService } from '../../../src/services/organizations/archiveOrganizationService'
import { findOrganization, archiveOrg } from '../../../src/repositories/organizations/orgRepository'
import { requireMembership }            from '../../../src/repositories/organizations/orgMembersRepository'
import { logger }                       from '../../../src/lib/logger'
import { GeneralErrorResponse }         from '../../../src/errors/GeneralErrorResponse'

// ── Helpers ────────────────────────────────────────────────────────────────────

const ORG_ID  = 'aaaaaaaa-0000-4000-8000-000000000001'
const USER_ID = 'bbbbbbbb-0000-4000-8000-000000000002'

const MOCK_ORG = {
  id:          ORG_ID,
  name:        'Projeto Ativo',
  description: null,
  status:      'ACTIVE',
  createdById: USER_ID,
  createdAt:   new Date('2026-01-01'),
  updatedAt:   new Date('2026-01-01'),
}

const MOCK_ORG_ARCHIVED = { ...MOCK_ORG, status: 'ARCHIVED' }

const VALID_INPUT = { orgId: ORG_ID, requestingUserId: USER_ID }

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()

  vi.mocked(findOrganization).mockResolvedValue(MOCK_ORG)
  vi.mocked(requireMembership).mockResolvedValue({ id: 'member-id', role: 'ADMIN' })
  vi.mocked(archiveOrg).mockResolvedValue(MOCK_ORG_ARCHIVED)
})

// ── Testes ─────────────────────────────────────────────────────────────────────

describe('archiveOrganizationService', () => {
  describe('arquivamento de organização (fluxo de sucesso)', () => {
    it('deve chamar archiveOrg com o orgId correto', async () => {
      await archiveOrganizationService(VALID_INPUT)

      expect(vi.mocked(archiveOrg)).toHaveBeenCalledWith(ORG_ID)
    })

    it('deve retornar a organização com status ARCHIVED', async () => {
      const result = await archiveOrganizationService(VALID_INPUT)

      expect(result.status).toBe('ARCHIVED')
      expect(result.id).toBe(ORG_ID)
    })

    it('deve verificar a existência da organização antes de arquivar', async () => {
      await archiveOrganizationService(VALID_INPUT)

      expect(vi.mocked(findOrganization)).toHaveBeenCalledWith(ORG_ID)
    })

    it('deve verificar a membership do usuário antes de arquivar', async () => {
      await archiveOrganizationService(VALID_INPUT)

      expect(vi.mocked(requireMembership)).toHaveBeenCalledWith(ORG_ID, USER_ID)
    })
  })

  describe('erros de negócio', () => {
    it('deve lançar 404 quando a organização não existe (findOrganization throws)', async () => {
      vi.mocked(findOrganization).mockRejectedValue(
        new GeneralErrorResponse(404 as any, { message: 'Organização não encontrada', code: 'ORG_NOT_FOUND' }),
      )

      const error = await archiveOrganizationService(VALID_INPUT).catch(e => e)

      expect(error).toBeInstanceOf(GeneralErrorResponse)
      expect((error as GeneralErrorResponse).code).toBe('ORG_NOT_FOUND')
    })

    it('deve lançar 400 quando a organização já está arquivada', async () => {
      vi.mocked(findOrganization).mockResolvedValue({ ...MOCK_ORG, status: 'ARCHIVED' })

      const error = await archiveOrganizationService(VALID_INPUT).catch(e => e)

      expect(error).toBeInstanceOf(GeneralErrorResponse)
      expect((error as GeneralErrorResponse).statusCode).toBe(400)
      expect((error as GeneralErrorResponse).code).toBe('ORG_ARCHIVED')
    })

    it('deve lançar 403 quando usuário não é ADMIN da org (é PROFESSOR)', async () => {
      vi.mocked(requireMembership).mockResolvedValue({ id: 'member-id', role: 'PROFESSOR' })

      const error = await archiveOrganizationService(VALID_INPUT).catch(e => e)

      expect(error).toBeInstanceOf(GeneralErrorResponse)
      expect((error as GeneralErrorResponse).statusCode).toBe(403)
      expect((error as GeneralErrorResponse).code).toBe('ORG_NOT_STAFF')
    })

    it('deve lançar 403 quando usuário é apenas MEMBER da org', async () => {
      vi.mocked(requireMembership).mockResolvedValue({ id: 'member-id', role: 'MEMBER' })

      const error = await archiveOrganizationService(VALID_INPUT).catch(e => e)

      expect(error).toBeInstanceOf(GeneralErrorResponse)
      expect((error as GeneralErrorResponse).statusCode).toBe(403)
    })

    it('não deve chamar archiveOrg quando a org já está arquivada', async () => {
      vi.mocked(findOrganization).mockResolvedValue({ ...MOCK_ORG, status: 'ARCHIVED' })

      await archiveOrganizationService(VALID_INPUT).catch(() => {})

      expect(vi.mocked(archiveOrg)).not.toHaveBeenCalled()
    })

    it('não deve chamar archiveOrg quando usuário não é ADMIN', async () => {
      vi.mocked(requireMembership).mockResolvedValue({ id: 'member-id', role: 'MEMBER' })

      await archiveOrganizationService(VALID_INPUT).catch(() => {})

      expect(vi.mocked(archiveOrg)).not.toHaveBeenCalled()
    })
  })

  describe('validação de entrada', () => {
    it('deve lançar erro quando orgId não é UUID válido', async () => {
      await expect(
        archiveOrganizationService({ orgId: 'invalido', requestingUserId: USER_ID }),
      ).rejects.toThrow()
    })

    it('deve lançar erro quando requestingUserId não é UUID válido', async () => {
      await expect(
        archiveOrganizationService({ orgId: ORG_ID, requestingUserId: 'invalido' }),
      ).rejects.toThrow()
    })
  })

  describe('logging de console (pino)', () => {
    it('deve logar "IN - archiveOrganizationService"', async () => {
      await archiveOrganizationService(VALID_INPUT)

      expect(vi.mocked(logger.info)).toHaveBeenCalledWith('IN - archiveOrganizationService')
    })

    it('deve logar "OUT - archiveOrganizationService"', async () => {
      await archiveOrganizationService(VALID_INPUT)

      expect(vi.mocked(logger.info)).toHaveBeenCalledWith('OUT - archiveOrganizationService')
    })
  })
})
