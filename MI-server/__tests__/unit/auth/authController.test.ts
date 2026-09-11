// __tests__/unit/auth/authController.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { FastifyRequest, FastifyReply } from 'fastify'
import { StatusCode } from '../../../src/utils/statusCode'

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock('../../../src/services/auth/authService', () => ({
  loginService: vi.fn(),
  refreshTokenService: vi.fn(),
  logoutService: vi.fn(),
}))

vi.mock('../../../src/repositories/auth/authRepository', () => ({
  createRefreshToken: vi.fn(),
  deleteRefreshToken: vi.fn(),
}))

vi.mock('../../../src/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

vi.mock('node:crypto', () => ({
  randomUUID: vi.fn().mockReturnValue('mocked-refresh-uuid'),
}))

vi.mock('../../../src/utils/time', () => ({
  parseDurationToDate: vi.fn().mockReturnValue(new Date('2026-12-31T00:00:00Z')),
}))

import {
  loginController,
  refreshController,
  logoutController,
} from '../../../src/controllers/auth/authController'
import {
  loginService,
  refreshTokenService,
  logoutService,
} from '../../../src/services/auth/authService'
import {
  createRefreshToken,
  deleteRefreshToken,
} from '../../../src/repositories/auth/authRepository'
import { logger } from '../../../src/lib/logger'
import { GeneralErrorResponse } from '../../../src/errors/GeneralErrorResponse'
import { ERRORS, buildError } from '../../../src/lib/errors/errors'
import type { AuthUserDTO } from '../../../src/@types/auth'

// ── Helpers ────────────────────────────────────────────────────────────────────

const mockJwtSign = vi.fn().mockReturnValue('mock-access-token')

function makeMockReply(): FastifyReply {
  return {
    status: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    setCookie: vi.fn().mockReturnThis(),
    clearCookie: vi.fn().mockReturnThis(),
  } as unknown as FastifyReply
}

function makeMockAuthUser(overrides: Partial<AuthUserDTO> = {}): AuthUserDTO {
  return {
    id: 'user-uuid-123',
    name: 'João Silva',
    email: 'joao@example.com',
    role: 'COMMON',
    canUpload: false,
    ...overrides,
  }
}

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  mockJwtSign.mockReturnValue('mock-access-token')
  vi.mocked(loginService).mockResolvedValue(makeMockAuthUser())
  vi.mocked(refreshTokenService).mockResolvedValue(makeMockAuthUser())
  vi.mocked(logoutService).mockResolvedValue(undefined)
  vi.mocked(createRefreshToken).mockResolvedValue({
    id: 'rtoken-id',
    token: 'mocked-refresh-uuid',
    userId: 'user-uuid-123',
    expiresAt: new Date('2026-12-31'),
    createdAt: new Date(),
  })
  vi.mocked(deleteRefreshToken).mockResolvedValue(undefined)
})

// ── loginController ────────────────────────────────────────────────────────────

describe('loginController', () => {
  function makeMockLoginRequest(bodyOverrides = {}) {
    return {
      server: { jwt: { sign: mockJwtSign } },
      cookies: {},
      body: { email: 'joao@example.com', password: 'senha123', ...bodyOverrides },
    } as unknown as FastifyRequest<{ Body: { email: string; password: string } }>
  }

  describe('fluxo de sucesso', () => {
    it('deve chamar loginService com o body da requisição', async () => {
      const request = makeMockLoginRequest()
      await loginController(request, makeMockReply())

      expect(vi.mocked(loginService)).toHaveBeenCalledWith(request.body)
    })

    it('deve assinar o JWT com os dados corretos do usuário', async () => {
      await loginController(makeMockLoginRequest(), makeMockReply())

      expect(mockJwtSign).toHaveBeenCalledWith(
        { sub: 'user-uuid-123', role: 'COMMON', canUpload: false },
        { expiresIn: '15m' },
      )
    })

    it('deve criar o refresh token no banco com o UUID gerado', async () => {
      await loginController(makeMockLoginRequest(), makeMockReply())

      expect(vi.mocked(createRefreshToken)).toHaveBeenCalledWith({
        token: 'mocked-refresh-uuid',
        userId: 'user-uuid-123',
        expiresAt: new Date('2026-12-31T00:00:00Z'),
      })
    })

    it('deve definir o cookie httpOnly com o refresh token', async () => {
      const reply = makeMockReply()
      await loginController(makeMockLoginRequest(), reply)

      expect(reply.setCookie).toHaveBeenCalledWith(
        'refreshToken',
        'mocked-refresh-uuid',
        expect.objectContaining({ httpOnly: true, path: '/' }),
      )
    })

    it('deve responder com status 200 contendo accessToken e dados do usuário', async () => {
      const reply = makeMockReply()
      await loginController(makeMockLoginRequest(), reply)

      expect(reply.status).toHaveBeenCalledWith(200)
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          accessToken: 'mock-access-token',
          user: expect.objectContaining({ id: 'user-uuid-123', email: 'joao@example.com' }),
        }),
      )
    })
  })

  describe('fluxo de erro', () => {
    it('deve re-lançar o erro quando loginService falha', async () => {
      const thrownError = new GeneralErrorResponse(StatusCode.UNAUTHORIZED, buildError(ERRORS.USER.INVALID_CREDENTIALS))
      vi.mocked(loginService).mockRejectedValue(thrownError)

      await expect(
        loginController(makeMockLoginRequest(), makeMockReply()),
      ).rejects.toThrow(thrownError)
    })

    it('não deve criar refresh token quando loginService falha', async () => {
      vi.mocked(loginService).mockRejectedValue(new Error('fail'))

      await loginController(makeMockLoginRequest(), makeMockReply()).catch(() => {})

      expect(vi.mocked(createRefreshToken)).not.toHaveBeenCalled()
    })

    it('deve logar ERROR quando loginService falha', async () => {
      vi.mocked(loginService).mockRejectedValue(new Error('fail'))

      await loginController(makeMockLoginRequest(), makeMockReply()).catch(() => {})

      expect(vi.mocked(logger.error)).toHaveBeenCalledWith(
        expect.objectContaining({ err: expect.any(Error) }),
        'ERROR - loginController',
      )
    })
  })

  describe('logging de console (pino)', () => {
    it('deve logar "IN - loginController" ao receber a requisição', async () => {
      await loginController(makeMockLoginRequest(), makeMockReply())

      expect(vi.mocked(logger.info)).toHaveBeenCalledWith('IN - loginController')
    })

    it('deve logar "OUT - loginController" ao responder com sucesso', async () => {
      await loginController(makeMockLoginRequest(), makeMockReply())

      expect(vi.mocked(logger.info)).toHaveBeenCalledWith('OUT - loginController')
    })
  })
})

// ── refreshController ──────────────────────────────────────────────────────────

describe('refreshController', () => {
  function makeMockRefreshRequest(cookies: Record<string, string> = {}) {
    return {
      server: { jwt: { sign: mockJwtSign } },
      cookies: { refreshToken: 'existing-refresh-token', ...cookies },
    } as unknown as FastifyRequest
  }

  describe('fluxo de sucesso', () => {
    it('deve chamar refreshTokenService com o token do cookie', async () => {
      await refreshController(makeMockRefreshRequest(), makeMockReply())

      expect(vi.mocked(refreshTokenService)).toHaveBeenCalledWith('existing-refresh-token')
    })

    it('deve deletar o refresh token antigo (rotação)', async () => {
      await refreshController(makeMockRefreshRequest(), makeMockReply())

      expect(vi.mocked(deleteRefreshToken)).toHaveBeenCalledWith('existing-refresh-token')
    })

    it('deve criar um novo refresh token no banco', async () => {
      await refreshController(makeMockRefreshRequest(), makeMockReply())

      expect(vi.mocked(createRefreshToken)).toHaveBeenCalledWith({
        token: 'mocked-refresh-uuid',
        userId: 'user-uuid-123',
        expiresAt: new Date('2026-12-31T00:00:00Z'),
      })
    })

    it('deve atualizar o cookie com o novo refresh token', async () => {
      const reply = makeMockReply()
      await refreshController(makeMockRefreshRequest(), reply)

      expect(reply.setCookie).toHaveBeenCalledWith(
        'refreshToken',
        'mocked-refresh-uuid',
        expect.objectContaining({ httpOnly: true }),
      )
    })

    it('deve responder com status 200 contendo o novo accessToken', async () => {
      const reply = makeMockReply()
      await refreshController(makeMockRefreshRequest(), reply)

      expect(reply.status).toHaveBeenCalledWith(200)
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({ accessToken: 'mock-access-token' }),
      )
    })
  })

  describe('cookie ausente', () => {
    it('deve lançar UNAUTHORIZED quando o cookie de refresh token está ausente', async () => {
      const requestSemCookie = {
        server: { jwt: { sign: mockJwtSign } },
        cookies: {},
      } as unknown as FastifyRequest

      await expect(
        refreshController(requestSemCookie, makeMockReply()),
      ).rejects.toBeInstanceOf(GeneralErrorResponse)
    })

    it('deve lançar com code UNAUTHORIZED quando cookie está ausente', async () => {
      const requestSemCookie = {
        server: { jwt: { sign: mockJwtSign } },
        cookies: {},
      } as unknown as FastifyRequest

      const error = await refreshController(requestSemCookie, makeMockReply()).catch(
        (e: unknown) => e,
      )

      expect((error as GeneralErrorResponse).code).toBe('UNAUTHORIZED')
    })
  })

  describe('fluxo de erro', () => {
    it('deve re-lançar o erro quando refreshTokenService falha', async () => {
      const thrownError = new GeneralErrorResponse(StatusCode.UNAUTHORIZED, buildError(ERRORS.AUTH.UNAUTHORIZED))
      vi.mocked(refreshTokenService).mockRejectedValue(thrownError)

      await expect(
        refreshController(makeMockRefreshRequest(), makeMockReply()),
      ).rejects.toThrow(thrownError)
    })
  })

  describe('logging de console (pino)', () => {
    it('deve logar IN e OUT em caso de sucesso', async () => {
      await refreshController(makeMockRefreshRequest(), makeMockReply())

      expect(vi.mocked(logger.info)).toHaveBeenCalledWith('IN - refreshController')
      expect(vi.mocked(logger.info)).toHaveBeenCalledWith('OUT - refreshController')
    })
  })
})

// ── logoutController ───────────────────────────────────────────────────────────

describe('logoutController', () => {
  function makeMockLogoutRequest(cookies: Record<string, string> = {}) {
    return {
      cookies: { refreshToken: 'user-refresh-token', ...cookies },
    } as unknown as FastifyRequest
  }

  describe('fluxo de sucesso', () => {
    it('deve chamar logoutService quando o cookie de refresh token existe', async () => {
      await logoutController(makeMockLogoutRequest(), makeMockReply())

      expect(vi.mocked(logoutService)).toHaveBeenCalledWith('user-refresh-token')
    })

    it('não deve chamar logoutService quando o cookie está ausente', async () => {
      const requestSemCookie = { cookies: {} } as unknown as FastifyRequest

      await logoutController(requestSemCookie, makeMockReply())

      expect(vi.mocked(logoutService)).not.toHaveBeenCalled()
    })

    it('deve limpar o cookie refreshToken sempre', async () => {
      const reply = makeMockReply()
      await logoutController(makeMockLogoutRequest(), reply)

      expect(reply.clearCookie).toHaveBeenCalledWith('refreshToken', expect.objectContaining({ path: '/' }))
    })

    it('deve limpar o cookie mesmo quando não há refresh token no cookie', async () => {
      const requestSemCookie = { cookies: {} } as unknown as FastifyRequest
      const reply = makeMockReply()

      await logoutController(requestSemCookie, reply)

      expect(reply.clearCookie).toHaveBeenCalledWith('refreshToken', expect.anything())
    })

    it('deve responder com status 204', async () => {
      const reply = makeMockReply()
      await logoutController(makeMockLogoutRequest(), reply)

      expect(reply.status).toHaveBeenCalledWith(204)
    })
  })

  describe('fluxo de erro', () => {
    it('deve re-lançar o erro quando logoutService falha', async () => {
      const thrownError = new Error('DB connection lost')
      vi.mocked(logoutService).mockRejectedValue(thrownError)

      await expect(
        logoutController(makeMockLogoutRequest(), makeMockReply()),
      ).rejects.toThrow(thrownError)
    })
  })

  describe('logging de console (pino)', () => {
    it('deve logar "IN - logoutController" ao receber a requisição', async () => {
      await logoutController(makeMockLogoutRequest(), makeMockReply())

      expect(vi.mocked(logger.info)).toHaveBeenCalledWith('IN - logoutController')
    })

    it('deve logar "OUT - logoutController" ao responder com sucesso', async () => {
      await logoutController(makeMockLogoutRequest(), makeMockReply())

      expect(vi.mocked(logger.info)).toHaveBeenCalledWith('OUT - logoutController')
    })
  })
})
