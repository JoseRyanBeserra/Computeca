// __tests__/unit/auth/authService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock('../../../src/repositories/users/usersRepository', () => ({
  findUserByEmail: vi.fn(),
  findUserById: vi.fn(),
}))

vi.mock('../../../src/repositories/auth/authRepository', () => ({
  findRefreshToken: vi.fn(),
  deleteRefreshToken: vi.fn(),
}))

vi.mock('../../../src/repositories/audit/auditRepository', () => ({
  createAuditLog: vi.fn(),
}))

vi.mock('../../../src/utils/hash', () => ({
  comparePassword: vi.fn(),
}))

vi.mock('../../../src/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

import {
  loginService,
  refreshTokenService,
  logoutService,
} from '../../../src/services/auth/authService'
import { findUserByEmail, findUserById } from '../../../src/repositories/users/usersRepository'
import {
  findRefreshToken,
  deleteRefreshToken,
} from '../../../src/repositories/auth/authRepository'
import { createAuditLog } from '../../../src/repositories/audit/auditRepository'
import { comparePassword } from '../../../src/utils/hash'
import { logger } from '../../../src/lib/logger'
import { GeneralErrorResponse } from '../../../src/errors/GeneralErrorResponse'

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeMockUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-uuid-123',
    name: 'João Silva',
    email: 'joao@example.com',
    passwordHash: 'hashed_password',
    role: 'COMMON' as const,
    canUpload: false,
    emailVerified: true,
    suspended: false,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    refreshTokens: [],
    auditLogs: [],
    ...overrides,
  }
}

function makeMockRefreshToken(overrides: Record<string, unknown> = {}) {
  return {
    id: 'rtoken-uuid-456',
    token: 'test-refresh-token',
    userId: 'user-uuid-123',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    createdAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  }
}

const validLoginInput = {
  email: 'joao@example.com',
  password: 'senha123',
}

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(findUserByEmail).mockResolvedValue(makeMockUser())
  vi.mocked(findUserById).mockResolvedValue(makeMockUser())
  vi.mocked(comparePassword).mockResolvedValue(true)
  vi.mocked(createAuditLog).mockResolvedValue(undefined)
  vi.mocked(findRefreshToken).mockResolvedValue(makeMockRefreshToken())
  vi.mocked(deleteRefreshToken).mockResolvedValue(undefined)
})

// ── loginService ───────────────────────────────────────────────────────────────

describe('loginService', () => {
  describe('fluxo de sucesso', () => {
    it('deve retornar AuthUserDTO com os campos públicos do usuário', async () => {
      const result = await loginService(validLoginInput)

      expect(result).toEqual({
        id: 'user-uuid-123',
        name: 'João Silva',
        email: 'joao@example.com',
        role: 'COMMON',
        canUpload: false,
      })
    })

    it('nunca deve retornar passwordHash na resposta', async () => {
      const result = await loginService(validLoginInput)

      expect(result).not.toHaveProperty('passwordHash')
    })

    it('nunca deve retornar campos internos como suspended, emailVerified, createdAt', async () => {
      const result = await loginService(validLoginInput)

      expect(result).not.toHaveProperty('suspended')
      expect(result).not.toHaveProperty('emailVerified')
      expect(result).not.toHaveProperty('createdAt')
      expect(result).not.toHaveProperty('updatedAt')
    })

    it('deve comparar a senha com o hash armazenado', async () => {
      await loginService(validLoginInput)

      expect(vi.mocked(comparePassword)).toHaveBeenCalledWith(
        'senha123',
        'hashed_password',
      )
    })

    it('deve registrar AuditLog USER_LOGGED_IN após autenticação bem-sucedida', async () => {
      await loginService(validLoginInput)

      expect(vi.mocked(createAuditLog)).toHaveBeenCalledOnce()
      expect(vi.mocked(createAuditLog)).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'user-uuid-123',
          targetId: 'user-uuid-123',
          action: 'USER_LOGGED_IN',
        }),
      )
    })
  })

  describe('credenciais inválidas', () => {
    it('deve lançar INVALID_CREDENTIALS (401) quando usuário não existe', async () => {
      vi.mocked(findUserByEmail).mockResolvedValue(null)

      const error = await loginService(validLoginInput).catch((e: unknown) => e)

      expect(error).toBeInstanceOf(GeneralErrorResponse)
      expect((error as GeneralErrorResponse).statusCode).toBe(401)
      expect((error as GeneralErrorResponse).code).toBe('INVALID_CREDENTIALS')
    })

    it('deve lançar INVALID_CREDENTIALS (401) quando a senha está errada', async () => {
      vi.mocked(comparePassword).mockResolvedValue(false)

      const error = await loginService(validLoginInput).catch((e: unknown) => e)

      expect(error).toBeInstanceOf(GeneralErrorResponse)
      expect((error as GeneralErrorResponse).statusCode).toBe(401)
      expect((error as GeneralErrorResponse).code).toBe('INVALID_CREDENTIALS')
    })

    it('deve usar a mesma mensagem de erro para usuário não encontrado e senha errada (timing-safe)', async () => {
      vi.mocked(findUserByEmail).mockResolvedValue(null)
      const notFoundError = await loginService(validLoginInput).catch((e: GeneralErrorResponse) => e)

      vi.mocked(findUserByEmail).mockResolvedValue(makeMockUser())
      vi.mocked(comparePassword).mockResolvedValue(false)
      const wrongPasswordError = await loginService(validLoginInput).catch((e: GeneralErrorResponse) => e)

      expect((notFoundError as GeneralErrorResponse).message).toBe(
        (wrongPasswordError as GeneralErrorResponse).message,
      )
    })

    it('não deve chamar createAuditLog quando as credenciais são inválidas', async () => {
      vi.mocked(comparePassword).mockResolvedValue(false)

      await loginService(validLoginInput).catch(() => {})

      expect(vi.mocked(createAuditLog)).not.toHaveBeenCalled()
    })
  })

  describe('conta suspensa', () => {
    it('deve lançar ACCOUNT_SUSPENDED (403) quando a conta está suspensa', async () => {
      vi.mocked(findUserByEmail).mockResolvedValue(makeMockUser({ suspended: true }))

      const error = await loginService(validLoginInput).catch((e: unknown) => e)

      expect(error).toBeInstanceOf(GeneralErrorResponse)
      expect((error as GeneralErrorResponse).statusCode).toBe(403)
      expect((error as GeneralErrorResponse).code).toBe('ACCOUNT_SUSPENDED')
    })

    it('não deve criar AuditLog para conta suspensa', async () => {
      vi.mocked(findUserByEmail).mockResolvedValue(makeMockUser({ suspended: true }))

      await loginService(validLoginInput).catch(() => {})

      expect(vi.mocked(createAuditLog)).not.toHaveBeenCalled()
    })
  })

  describe('e-mail não verificado', () => {
    it('deve lançar EMAIL_NOT_VERIFIED (403) quando emailVerified é false', async () => {
      vi.mocked(findUserByEmail).mockResolvedValue(
        makeMockUser({ emailVerified: false, role: 'INSTITUTIONALIZED' }),
      )

      const error = await loginService(validLoginInput).catch((e: unknown) => e)

      expect(error).toBeInstanceOf(GeneralErrorResponse)
      expect((error as GeneralErrorResponse).statusCode).toBe(403)
      expect((error as GeneralErrorResponse).code).toBe('EMAIL_NOT_VERIFIED')
    })

    it('não deve criar AuditLog para e-mail não verificado', async () => {
      vi.mocked(findUserByEmail).mockResolvedValue(
        makeMockUser({ emailVerified: false }),
      )

      await loginService(validLoginInput).catch(() => {})

      expect(vi.mocked(createAuditLog)).not.toHaveBeenCalled()
    })

    it('deve verificar emailVerified após verificar suspended (ordem das checagens)', async () => {
      // Conta suspensa E e-mail não verificado → deve lançar ACCOUNT_SUSPENDED
      vi.mocked(findUserByEmail).mockResolvedValue(
        makeMockUser({ suspended: true, emailVerified: false }),
      )

      const error = await loginService(validLoginInput).catch((e: GeneralErrorResponse) => e)

      expect((error as GeneralErrorResponse).code).toBe('ACCOUNT_SUSPENDED')
    })
  })

  describe('logging de console (pino)', () => {
    it('deve logar "IN - loginService" ao iniciar', async () => {
      await loginService(validLoginInput)

      expect(vi.mocked(logger.info)).toHaveBeenCalledWith('IN - loginService')
    })

    it('deve logar "OUT - loginService" ao concluir com sucesso', async () => {
      await loginService(validLoginInput)

      expect(vi.mocked(logger.info)).toHaveBeenCalledWith('OUT - loginService')
    })

    it('deve logar IN mesmo quando ocorre erro de credenciais inválidas', async () => {
      vi.mocked(comparePassword).mockResolvedValue(false)

      await loginService(validLoginInput).catch(() => {})

      expect(vi.mocked(logger.info)).toHaveBeenCalledWith('IN - loginService')
    })

    it('não deve logar a senha em nenhum momento', async () => {
      await loginService({ email: 'joao@example.com', password: 'senha_super_secreta' })

      const allLoggedStrings = JSON.stringify([
        ...vi.mocked(logger.info).mock.calls,
        ...vi.mocked(logger.error).mock.calls,
      ])

      expect(allLoggedStrings).not.toContain('senha_super_secreta')
    })
  })
})

// ── refreshTokenService ────────────────────────────────────────────────────────

describe('refreshTokenService', () => {
  describe('fluxo de sucesso', () => {
    it('deve retornar AuthUserDTO para um refresh token válido', async () => {
      const result = await refreshTokenService('test-refresh-token')

      expect(result).toEqual({
        id: 'user-uuid-123',
        name: 'João Silva',
        email: 'joao@example.com',
        role: 'COMMON',
        canUpload: false,
      })
    })

    it('nunca deve retornar passwordHash na resposta', async () => {
      const result = await refreshTokenService('test-refresh-token')

      expect(result).not.toHaveProperty('passwordHash')
    })
  })

  describe('token inválido ou expirado', () => {
    it('deve lançar UNAUTHORIZED (401) quando o token não existe no banco', async () => {
      vi.mocked(findRefreshToken).mockResolvedValue(null)

      const error = await refreshTokenService('token-invalido').catch((e: unknown) => e)

      expect(error).toBeInstanceOf(GeneralErrorResponse)
      expect((error as GeneralErrorResponse).statusCode).toBe(401)
      expect((error as GeneralErrorResponse).code).toBe('UNAUTHORIZED')
    })

    it('deve lançar UNAUTHORIZED (401) quando o token está expirado', async () => {
      vi.mocked(findRefreshToken).mockResolvedValue(
        makeMockRefreshToken({ expiresAt: new Date('2020-01-01') }),
      )

      const error = await refreshTokenService('token-expirado').catch((e: unknown) => e)

      expect(error).toBeInstanceOf(GeneralErrorResponse)
      expect((error as GeneralErrorResponse).code).toBe('UNAUTHORIZED')
    })

    it('deve deletar o token expirado do banco antes de lançar o erro', async () => {
      vi.mocked(findRefreshToken).mockResolvedValue(
        makeMockRefreshToken({ expiresAt: new Date('2020-01-01') }),
      )

      await refreshTokenService('token-expirado').catch(() => {})

      expect(vi.mocked(deleteRefreshToken)).toHaveBeenCalledWith('token-expirado')
    })
  })

  describe('usuário suspenso ou inexistente', () => {
    it('deve lançar UNAUTHORIZED quando o usuário associado está suspenso', async () => {
      vi.mocked(findUserById).mockResolvedValue(makeMockUser({ suspended: true }))

      const error = await refreshTokenService('test-refresh-token').catch((e: unknown) => e)

      expect(error).toBeInstanceOf(GeneralErrorResponse)
      expect((error as GeneralErrorResponse).code).toBe('UNAUTHORIZED')
    })

    it('deve lançar UNAUTHORIZED quando o usuário associado não existe mais', async () => {
      vi.mocked(findUserById).mockResolvedValue(null)

      const error = await refreshTokenService('test-refresh-token').catch((e: unknown) => e)

      expect(error).toBeInstanceOf(GeneralErrorResponse)
      expect((error as GeneralErrorResponse).code).toBe('UNAUTHORIZED')
    })
  })

  describe('logging de console (pino)', () => {
    it('deve logar IN e OUT em caso de sucesso', async () => {
      await refreshTokenService('test-refresh-token')

      expect(vi.mocked(logger.info)).toHaveBeenCalledWith('IN - refreshTokenService')
      expect(vi.mocked(logger.info)).toHaveBeenCalledWith('OUT - refreshTokenService')
    })
  })
})

// ── logoutService ──────────────────────────────────────────────────────────────

describe('logoutService', () => {
  it('deve chamar deleteRefreshToken com o token recebido', async () => {
    await logoutService('token-para-revogar')

    expect(vi.mocked(deleteRefreshToken)).toHaveBeenCalledOnce()
    expect(vi.mocked(deleteRefreshToken)).toHaveBeenCalledWith('token-para-revogar')
  })

  it('deve logar IN e OUT', async () => {
    await logoutService('token-para-revogar')

    expect(vi.mocked(logger.info)).toHaveBeenCalledWith('IN - logoutService')
    expect(vi.mocked(logger.info)).toHaveBeenCalledWith('OUT - logoutService')
  })
})
