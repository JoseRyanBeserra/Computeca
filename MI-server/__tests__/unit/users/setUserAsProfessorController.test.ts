// __tests__/unit/users/setUserAsProfessorController.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { FastifyRequest, FastifyReply } from 'fastify'
import type { IUser } from '../../../src/@types/users'

// ── Mocks ──────────────────────────────────────────────────────────────────────
vi.mock('../../../src/services/users/setUserAsProfessorService', () => ({
  setUserAsProfessorService: vi.fn(),
}))

vi.mock('../../../src/repositories/inspectionLog/inspectionLogRepository', () => ({
  createInspectionLog: vi.fn(),
}))

vi.mock('../../../src/lib/logger', () => ({
  logger: {
    info:  vi.fn(),
    error: vi.fn(),
    warn:  vi.fn(),
    debug: vi.fn(),
  },
}))

import { setUserAsProfessorController } from '../../../src/controllers/users/setUserAsProfessorController'
import { setUserAsProfessorService }     from '../../../src/services/users/setUserAsProfessorService'
import { createInspectionLog }           from '../../../src/repositories/inspectionLog/inspectionLogRepository'
import { logger }                        from '../../../src/lib/logger'
import { GeneralErrorResponse }          from '../../../src/errors/GeneralErrorResponse'
import { ERRORS, buildError }            from '../../../src/lib/errors/errors'
import { StatusCode }                    from '../../../src/utils/statusCode'

// ── Helpers ────────────────────────────────────────────────────────────────────

const TARGET_ID = 'target-uuid-123'
const ADMIN_ID  = 'admin-uuid-456'

function makeMockRequest(
  overrides: Partial<{ params: object; user: object }> = {},
): FastifyRequest {
  return {
    method: 'PATCH',
    url:    `/users/${TARGET_ID}/set-professor`,
    params: { id: TARGET_ID },
    user:   { sub: ADMIN_ID, role: 'ADMIN', canUpload: false },
    ...overrides,
  } as unknown as FastifyRequest
}

function makeMockReply(): FastifyReply {
  return {
    status: vi.fn().mockReturnThis(),
    send:   vi.fn().mockReturnThis(),
  } as unknown as FastifyReply
}

function makePromotedUser(): IUser {
  return {
    id:           TARGET_ID,
    name:         'Carlos Professor',
    email:        'carlos@example.com',
    role:         'PROFESSOR',
    canUpload:    false,
    emailVerified: true,
    suspended:    false,
    createdAt:    new Date('2026-01-01T00:00:00Z'),
    updatedAt:    new Date('2026-01-01T00:00:00Z'),
  }
}

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(createInspectionLog).mockResolvedValue(undefined)
  vi.mocked(setUserAsProfessorService).mockResolvedValue(makePromotedUser())
})

// ── Testes ─────────────────────────────────────────────────────────────────────

describe('setUserAsProfessorController', () => {
  describe('fluxo de sucesso', () => {
    it('deve chamar setUserAsProfessorService com targetUserId e requestingAdminId', async () => {
      await setUserAsProfessorController(makeMockRequest(), makeMockReply())

      expect(vi.mocked(setUserAsProfessorService)).toHaveBeenCalledWith({
        targetUserId:      TARGET_ID,
        requestingAdminId: ADMIN_ID,
      })
    })

    it('deve responder com status 200', async () => {
      const reply = makeMockReply()

      await setUserAsProfessorController(makeMockRequest(), reply)

      expect(reply.status).toHaveBeenCalledWith(200)
    })

    it('deve enviar os dados do usuário promovido no body', async () => {
      const reply = makeMockReply()

      await setUserAsProfessorController(makeMockRequest(), reply)

      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({ id: TARGET_ID, role: 'PROFESSOR' }),
      )
    })
  })

  describe('autorização', () => {
    it('deve lançar GeneralErrorResponse 403 quando role é COMMON', async () => {
      const request = makeMockRequest({
        user: { sub: 'user-uuid', role: 'COMMON', canUpload: false },
      })

      const error = await setUserAsProfessorController(request, makeMockReply()).catch((e) => e)

      expect(error).toBeInstanceOf(GeneralErrorResponse)
      expect((error as GeneralErrorResponse).statusCode).toBe(403)
    })

    it('deve lançar 403 quando role é PROFESSOR', async () => {
      const request = makeMockRequest({
        user: { sub: 'prof-uuid', role: 'PROFESSOR', canUpload: false },
      })

      const error = await setUserAsProfessorController(request, makeMockReply()).catch((e) => e)

      expect(error).toBeInstanceOf(GeneralErrorResponse)
      expect((error as GeneralErrorResponse).statusCode).toBe(403)
    })

    it('não deve chamar setUserAsProfessorService quando não autorizado', async () => {
      const request = makeMockRequest({
        user: { sub: 'user-uuid', role: 'COMMON', canUpload: false },
      })

      await setUserAsProfessorController(request, makeMockReply()).catch(() => {})

      expect(vi.mocked(setUserAsProfessorService)).not.toHaveBeenCalled()
    })
  })

  describe('InspectionLog — rastreio em banco', () => {
    it('deve criar InspectionLog CLIENT_TO_SERVER antes do try', async () => {
      await setUserAsProfessorController(makeMockRequest(), makeMockReply())

      expect(vi.mocked(createInspectionLog)).toHaveBeenCalledWith(
        expect.objectContaining({
          direction:     'CLIENT_TO_SERVER',
          context:       'setUserAsProfessorController',
          correlationId: ADMIN_ID,
        }),
      )
    })

    it('InspectionLog CLIENT_TO_SERVER deve conter o targetUserId no payload', async () => {
      await setUserAsProfessorController(makeMockRequest(), makeMockReply())

      const clientToServerCall = vi.mocked(createInspectionLog).mock.calls.find(
        ([params]) => params.direction === 'CLIENT_TO_SERVER',
      )
      expect(clientToServerCall).toBeDefined()
      expect(JSON.stringify(clientToServerCall![0].payload)).toContain(TARGET_ID)
    })

    it('deve criar InspectionLog SERVER_TO_CLIENT em caso de sucesso', async () => {
      await setUserAsProfessorController(makeMockRequest(), makeMockReply())

      const successCall = vi.mocked(createInspectionLog).mock.calls.find(
        ([params]) =>
          params.direction === 'SERVER_TO_CLIENT' &&
          !JSON.stringify(params.payload).includes('Erro'),
      )
      expect(successCall).toBeDefined()
    })

    it('InspectionLog SERVER_TO_CLIENT de sucesso deve conter statusCode 200', async () => {
      await setUserAsProfessorController(makeMockRequest(), makeMockReply())

      const successCall = vi.mocked(createInspectionLog).mock.calls.find(
        ([params]) =>
          params.direction === 'SERVER_TO_CLIENT' &&
          JSON.stringify(params.payload).includes('200'),
      )
      expect(successCall).toBeDefined()
    })

    it('deve criar InspectionLog de erro quando service falha', async () => {
      vi.mocked(setUserAsProfessorService).mockRejectedValue(
        new GeneralErrorResponse(StatusCode.NOT_FOUND, buildError(ERRORS.USER.USER_NOT_FOUND)),
      )

      await setUserAsProfessorController(makeMockRequest(), makeMockReply()).catch(() => {})

      const errorCall = vi.mocked(createInspectionLog).mock.calls.find(
        ([params]) =>
          params.direction === 'SERVER_TO_CLIENT' &&
          JSON.stringify(params.payload).includes('Erro'),
      )
      expect(errorCall).toBeDefined()
    })

    it('InspectionLog de erro deve conter o code da exceção', async () => {
      vi.mocked(setUserAsProfessorService).mockRejectedValue(
        new GeneralErrorResponse(StatusCode.NOT_FOUND, buildError(ERRORS.USER.USER_NOT_FOUND)),
      )

      await setUserAsProfessorController(makeMockRequest(), makeMockReply()).catch(() => {})

      const errorCall = vi.mocked(createInspectionLog).mock.calls.find(
        ([params]) =>
          params.direction === 'SERVER_TO_CLIENT' &&
          JSON.stringify(params.payload).includes('USER_NOT_FOUND'),
      )
      expect(errorCall).toBeDefined()
    })

    it('deve criar InspectionLog CLIENT_TO_SERVER mesmo quando não autorizado', async () => {
      const request = makeMockRequest({
        user: { sub: 'user-uuid', role: 'COMMON', canUpload: false },
      })

      await setUserAsProfessorController(request, makeMockReply()).catch(() => {})

      expect(vi.mocked(createInspectionLog)).toHaveBeenCalledWith(
        expect.objectContaining({ direction: 'CLIENT_TO_SERVER' }),
      )
    })

    it('deve re-lançar o erro após registrar o InspectionLog de erro', async () => {
      const thrownError = new GeneralErrorResponse(
        StatusCode.NOT_FOUND,
        buildError(ERRORS.USER.USER_NOT_FOUND),
      )
      vi.mocked(setUserAsProfessorService).mockRejectedValue(thrownError)

      await expect(
        setUserAsProfessorController(makeMockRequest(), makeMockReply()),
      ).rejects.toThrow(thrownError)
    })
  })

  describe('logging de console (pino)', () => {
    it('deve logar "IN - setUserAsProfessorController" ao receber a requisição', async () => {
      await setUserAsProfessorController(makeMockRequest(), makeMockReply())

      expect(vi.mocked(logger.info)).toHaveBeenCalledWith('IN - setUserAsProfessorController')
    })

    it('deve logar "OUT - setUserAsProfessorController" após responder com sucesso', async () => {
      await setUserAsProfessorController(makeMockRequest(), makeMockReply())

      expect(vi.mocked(logger.info)).toHaveBeenCalledWith('OUT - setUserAsProfessorController')
    })

    it('deve logar ERROR quando service lança exceção', async () => {
      vi.mocked(setUserAsProfessorService).mockRejectedValue(new Error('falha inesperada'))

      await setUserAsProfessorController(makeMockRequest(), makeMockReply()).catch(() => {})

      expect(vi.mocked(logger.error)).toHaveBeenCalledWith(
        expect.objectContaining({ err: expect.any(Error) }),
        'ERROR - setUserAsProfessorController',
      )
    })
  })
})
