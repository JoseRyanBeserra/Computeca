// __tests__/unit/organizations/updateOrganizationService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock('../../../src/repositories/organizations/orgRepository', () => ({
  findOrgById: vi.fn(),
  updateOrg:   vi.fn(),
}))

vi.mock('../../../src/repositories/organizations/orgMembersRepository', () => ({
  findMembership: vi.fn(),
}))

vi.mock('../../../src/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))

import { updateOrganizationService } from '../../../src/services/organizations/updateOrganizationService'
import { findOrgById, updateOrg }     from '../../../src/repositories/organizations/orgRepository'
import { findMembership }             from '../../../src/repositories/organizations/orgMembersRepository'
import { logger }                     from '../../../src/lib/logger'
import { GeneralErrorResponse }       from '../../../src/errors/GeneralErrorResponse'

// ── Helpers ────────────────────────────────────────────────────────────────────

const ORG_ID   = 'aaaaaaaa-0000-4000-8000-000000000001'
const USER_ID  = 'bbbbbbbb-0000-4000-8000-000000000002'

const MOCK_ORG = {
  id:          ORG_ID,
  name:        'Projeto Original',
  description: 'Desc original',
  status:      'ACTIVE',
  createdById: USER_ID,
  createdAt:   new Date('2026-01-01'),
  updatedAt:   new Date('2026-01-01'),
}

const MOCK_ORG_UPDATED = { ...MOCK_ORG, name: 'Novo Nome' }

const VALID_INPUT = {
  orgId:            ORG_ID,
  requestingUserId: USER_ID,
  name:             'Novo Nome',
}

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()

  vi.mocked(findOrgById).mockResolvedValue(MOCK_ORG)
  vi.mocked(findMembership).mockResolvedValue({ id: 'member-id', role: 'ADMIN' })
  vi.mocked(updateOrg).mockResolvedValue(MOCK_ORG_UPDATED)
})

// ── Testes ─────────────────────────────────────────────────────────────────────

describe('updateOrganizationService', () => {
  describe('atualização de organização (fluxo de sucesso)', () => {
    it('deve chamar updateOrg com o orgId e os novos dados', async () => {
      await updateOrganizationService(VALID_INPUT)

      expect(vi.mocked(updateOrg)).toHaveBeenCalledWith(
        ORG_ID,
        expect.objectContaining({ name: 'Novo Nome' }),
      )
    })

    it('deve retornar a organização atualizada', async () => {
      const result = await updateOrganizationService(VALID_INPUT)

      expect(result.name).toBe('Novo Nome')
      expect(result.id).toBe(ORG_ID)
    })

    it('deve permitir atualizar apenas a descrição', async () => {
      vi.mocked(updateOrg).mockResolvedValue({ ...MOCK_ORG, description: 'Nova desc' })

      const result = await updateOrganizationService({
        orgId:            ORG_ID,
        requestingUserId: USER_ID,
        description:      'Nova desc',
      })

      expect(result.description).toBe('Nova desc')
      expect(vi.mocked(updateOrg)).toHaveBeenCalledWith(
        ORG_ID,
        expect.objectContaining({ description: 'Nova desc' }),
      )
    })

    it('deve verificar a organização antes de qualquer alteração', async () => {
      await updateOrganizationService(VALID_INPUT)

      expect(vi.mocked(findOrgById)).toHaveBeenCalledWith(ORG_ID)
    })

    it('deve verificar se o usuário é ADMIN da org', async () => {
      await updateOrganizationService(VALID_INPUT)

      expect(vi.mocked(findMembership)).toHaveBeenCalledWith(ORG_ID, USER_ID)
    })
  })

  describe('erros de negócio', () => {
    it('deve lançar 404 quando a organização não existe', async () => {
      vi.mocked(findOrgById).mockResolvedValue(null)

      const error = await updateOrganizationService(VALID_INPUT).catch(e => e)

      expect(error).toBeInstanceOf(GeneralErrorResponse)
      expect((error as GeneralErrorResponse).statusCode).toBe(404)
      expect((error as GeneralErrorResponse).code).toBe('ORG_NOT_FOUND')
    })

    it('deve lançar 400 quando a organização está arquivada', async () => {
      vi.mocked(findOrgById).mockResolvedValue({ ...MOCK_ORG, status: 'ARCHIVED' })

      const error = await updateOrganizationService(VALID_INPUT).catch(e => e)

      expect(error).toBeInstanceOf(GeneralErrorResponse)
      expect((error as GeneralErrorResponse).statusCode).toBe(400)
      expect((error as GeneralErrorResponse).code).toBe('ORG_ARCHIVED')
    })

    it('deve lançar 403 quando usuário não é membro da org', async () => {
      vi.mocked(findMembership).mockResolvedValue(null)

      const error = await updateOrganizationService(VALID_INPUT).catch(e => e)

      expect(error).toBeInstanceOf(GeneralErrorResponse)
      expect((error as GeneralErrorResponse).statusCode).toBe(403)
      expect((error as GeneralErrorResponse).code).toBe('ORG_NOT_STAFF')
    })

    it('deve lançar 403 quando usuário é PROFESSOR (não ADMIN) da org', async () => {
      vi.mocked(findMembership).mockResolvedValue({ id: 'member-id', role: 'PROFESSOR' })

      const error = await updateOrganizationService(VALID_INPUT).catch(e => e)

      expect(error).toBeInstanceOf(GeneralErrorResponse)
      expect((error as GeneralErrorResponse).statusCode).toBe(403)
    })

    it('deve lançar 403 quando usuário é MEMBER da org', async () => {
      vi.mocked(findMembership).mockResolvedValue({ id: 'member-id', role: 'MEMBER' })

      const error = await updateOrganizationService(VALID_INPUT).catch(e => e)

      expect(error).toBeInstanceOf(GeneralErrorResponse)
      expect((error as GeneralErrorResponse).statusCode).toBe(403)
    })

    it('não deve chamar updateOrg quando a organização não existe', async () => {
      vi.mocked(findOrgById).mockResolvedValue(null)

      await updateOrganizationService(VALID_INPUT).catch(() => {})

      expect(vi.mocked(updateOrg)).not.toHaveBeenCalled()
    })

    it('não deve chamar updateOrg quando org está arquivada', async () => {
      vi.mocked(findOrgById).mockResolvedValue({ ...MOCK_ORG, status: 'ARCHIVED' })

      await updateOrganizationService(VALID_INPUT).catch(() => {})

      expect(vi.mocked(updateOrg)).not.toHaveBeenCalled()
    })

    it('não deve chamar updateOrg quando não autorizado', async () => {
      vi.mocked(findMembership).mockResolvedValue(null)

      await updateOrganizationService(VALID_INPUT).catch(() => {})

      expect(vi.mocked(updateOrg)).not.toHaveBeenCalled()
    })
  })

  describe('validação de entrada', () => {
    it('deve lançar erro quando orgId não é UUID válido', async () => {
      await expect(
        updateOrganizationService({ orgId: 'invalido', requestingUserId: USER_ID }),
      ).rejects.toThrow()
    })

    it('deve lançar erro quando requestingUserId não é UUID válido', async () => {
      await expect(
        updateOrganizationService({ orgId: ORG_ID, requestingUserId: 'invalido' }),
      ).rejects.toThrow()
    })
  })

  describe('logging de console (pino)', () => {
    it('deve logar "IN - updateOrganizationService"', async () => {
      await updateOrganizationService(VALID_INPUT)

      expect(vi.mocked(logger.info)).toHaveBeenCalledWith('IN - updateOrganizationService')
    })

    it('deve logar "OUT - updateOrganizationService"', async () => {
      await updateOrganizationService(VALID_INPUT)

      expect(vi.mocked(logger.info)).toHaveBeenCalledWith('OUT - updateOrganizationService')
    })
  })
})
