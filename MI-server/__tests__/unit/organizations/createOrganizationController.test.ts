// __tests__/unit/organizations/createOrganizationController.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { FastifyRequest, FastifyReply } from 'fastify'

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock('../../../src/services/organizations/createOrganizationService', () => ({
  createOrganizationService: vi.fn(),
}))

vi.mock('../../../src/repositories/inspectionLog/inspectionLogRepository', () => ({
  createInspectionLog: vi.fn(),
}))

vi.mock('../../../src/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))

import { createOrganizationController }    from '../../../src/controllers/organizations/createOrganizationController'
import { createOrganizationService }       from '../../../src/services/organizations/createOrganizationService'
import { createInspectionLog }             from '../../../src/repositories/inspectionLog/inspectionLogRepository'
import { logger }                          from '../../../src/lib/logger'
import { GeneralErrorResponse }            from '../../../src/errors/GeneralErrorResponse'
import { ERRORS, buildError }              from '../../../src/lib/errors/errors'
import { StatusCode }                      from '../../../src/utils/statusCode'

// ── Helpers ────────────────────────────────────────────────────────────────────

const ORG_ID  = 'aaaaaaaa-0000-4000-8000-000000000001'
const USER_ID = 'bbbbbbbb-0000-4000-8000-000000000002'

const MOCK_ORG = {
  id:          ORG_ID,
  name:        'Projeto de Extensão',
  description: 'Desc',
  status:      'ACTIVE',
  createdById: USER_ID,
  createdAt:   new Date('2026-01-01'),
  updatedAt:   new Date('2026-01-01'),
}

function makeMockRequest(overrides: Partial<{ body: object; user: object }> = {}): FastifyRequest {
  return {
    method: 'POST',
    url:    '/organizations',
    body:   { name: 'Projeto de Extensão', description: 'Desc' },
    user:   { sub: USER_ID, role: 'PROFESSOR', canUpload: false },
    ...overrides,
  } as unknown as FastifyRequest
}

function makeMockReply(): FastifyReply {
  return {
    status: vi.fn().mockReturnThis(),
    send:   vi.fn().mockReturnThis(),
  } as unknown as FastifyReply
}

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(createInspectionLog).mockResolvedValue(undefined)
  vi.mocked(createOrganizationService).mockResolvedValue(MOCK_ORG)
})

// ── Testes ─────────────────────────────────────────────────────────────────────

describe('createOrganizationController', () => {
  describe('fluxo de sucesso', () => {
    it('deve chamar createOrganizationService com name, description e createdById', async () => {
      const request = makeMockRequest()
      await createOrganizationController(request, makeMockReply())

      expect(vi.mocked(createOrganizationService)).toHaveBeenCalledWith(
        expect.objectContaining({
          name:        'Projeto de Extensão',
          description: 'Desc',
          createdById: USER_ID,
        }),
      )
    })

    it('deve responder com status 201', async () => {
      const reply = makeMockReply()
      await createOrganizationController(makeMockRequest(), reply)

      expect(reply.status).toHaveBeenCalledWith(201)
    })

    it('deve enviar a organização criada no body', async () => {
      const reply = makeMockReply()
      await createOrganizationController(makeMockRequest(), reply)

      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({ id: ORG_ID, name: 'Projeto de Extensão' }),
      )
    })

    it('deve funcionar para usuário com role ADMIN', async () => {
      const request = makeMockRequest({ user: { sub: USER_ID, role: 'ADMIN', canUpload: true } })
      const reply   = makeMockReply()

      await createOrganizationController(request, reply)

      expect(reply.status).toHaveBeenCalledWith(201)
    })
  })

  describe('autorização', () => {
    it('deve lançar 403 quando role é COMMON', async () => {
      const request = makeMockRequest({ user: { sub: USER_ID, role: 'COMMON', canUpload: false } })

      const error = await createOrganizationController(request, makeMockReply()).catch(e => e)

      expect(error).toBeInstanceOf(GeneralErrorResponse)
      expect((error as GeneralErrorResponse).statusCode).toBe(403)
    })

    it('deve lançar 403 quando role é INSTITUTIONALIZED', async () => {
      const request = makeMockRequest({ user: { sub: USER_ID, role: 'INSTITUTIONALIZED', canUpload: false } })

      const error = await createOrganizationController(request, makeMockReply()).catch(e => e)

      expect(error).toBeInstanceOf(GeneralErrorResponse)
      expect((error as GeneralErrorResponse).statusCode).toBe(403)
    })

    it('não deve chamar createOrganizationService quando não autorizado', async () => {
      const request = makeMockRequest({ user: { sub: USER_ID, role: 'COMMON', canUpload: false } })

      await createOrganizationController(request, makeMockReply()).catch(() => {})

      expect(vi.mocked(createOrganizationService)).not.toHaveBeenCalled()
    })
  })

  describe('InspectionLog — rastreio em banco', () => {
    it('deve criar InspectionLog CLIENT_TO_SERVER antes do try', async () => {
      await createOrganizationController(makeMockRequest(), makeMockReply())

      expect(vi.mocked(createInspectionLog)).toHaveBeenCalledWith(
        expect.objectContaining({
          direction:     'CLIENT_TO_SERVER',
          context:       'createOrganizationController',
          correlationId: USER_ID,
        }),
      )
    })

    it('InspectionLog CLIENT_TO_SERVER deve conter name e description no payload', async () => {
      await createOrganizationController(makeMockRequest(), makeMockReply())

      const c2sCall = vi.mocked(createInspectionLog).mock.calls.find(
        ([p]) => p.direction === 'CLIENT_TO_SERVER',
      )
      const payload = JSON.stringify(c2sCall![0].payload)
      expect(payload).toContain('Projeto de Extensão')
    })

    it('deve criar InspectionLog CLIENT_TO_SERVER mesmo quando não autorizado', async () => {
      const request = makeMockRequest({ user: { sub: USER_ID, role: 'COMMON', canUpload: false } })

      await createOrganizationController(request, makeMockReply()).catch(() => {})

      expect(vi.mocked(createInspectionLog)).toHaveBeenCalledWith(
        expect.objectContaining({ direction: 'CLIENT_TO_SERVER' }),
      )
    })

    it('deve criar InspectionLog SERVER_TO_CLIENT de sucesso com statusCode 201', async () => {
      await createOrganizationController(makeMockRequest(), makeMockReply())

      const s2cCall = vi.mocked(createInspectionLog).mock.calls.find(
        ([p]) =>
          p.direction === 'SERVER_TO_CLIENT' &&
          JSON.stringify(p.payload).includes('201'),
      )
      expect(s2cCall).toBeDefined()
    })

    it('deve criar InspectionLog SERVER_TO_CLIENT de erro ao falhar', async () => {
      vi.mocked(createOrganizationService).mockRejectedValue(
        new GeneralErrorResponse(StatusCode.CONFLICT, buildError(ERRORS.ORG.ORG_NOT_FOUND)),
      )

      await createOrganizationController(makeMockRequest(), makeMockReply()).catch(() => {})

      const errorCall = vi.mocked(createInspectionLog).mock.calls.find(
        ([p]) =>
          p.direction === 'SERVER_TO_CLIENT' &&
          JSON.stringify(p.payload).includes('Erro'),
      )
      expect(errorCall).toBeDefined()
    })

    it('deve re-lançar o erro após registrar InspectionLog de erro', async () => {
      const thrownError = new GeneralErrorResponse(
        StatusCode.CONFLICT,
        buildError(ERRORS.ORG.ORG_NOT_FOUND),
      )
      vi.mocked(createOrganizationService).mockRejectedValue(thrownError)

      await expect(
        createOrganizationController(makeMockRequest(), makeMockReply()),
      ).rejects.toThrow(thrownError)
    })
  })

  describe('logging de console (pino)', () => {
    it('deve logar "IN - createOrganizationController"', async () => {
      await createOrganizationController(makeMockRequest(), makeMockReply())

      expect(vi.mocked(logger.info)).toHaveBeenCalledWith('IN - createOrganizationController')
    })
  })
})
