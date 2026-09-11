// __tests__/unit/users/usersService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ──────────────────────────────────────────────────────────────────────
vi.mock('../../../src/repositories/users/usersRepository', () => ({
  findUserByEmail: vi.fn(),
  createUser: vi.fn(),
}))

vi.mock('../../../src/repositories/audit/auditRepository', () => ({
  createAuditLog: vi.fn(),
}))

vi.mock('../../../src/utils/hash', () => ({
  hashPassword: vi.fn(),
}))

// Logger pino mockado — evita output durante os testes
vi.mock('../../../src/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

import { createUserService } from '../../../src/services/users/usersService'
import {
  findUserByEmail,
  createUser,
} from '../../../src/repositories/users/usersRepository'
import { createAuditLog } from '../../../src/repositories/audit/auditRepository'
import { hashPassword } from '../../../src/utils/hash'
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
    ...overrides,
  }
}

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()

  vi.mocked(findUserByEmail).mockResolvedValue(null)
  vi.mocked(hashPassword).mockResolvedValue('hashed_password')
  vi.mocked(createUser).mockResolvedValue(makeMockUser())
  vi.mocked(createAuditLog).mockResolvedValue(undefined)
})

// ── Testes ─────────────────────────────────────────────────────────────────────

describe('createUserService', () => {
  describe('cadastro de usuário COMMON (RF01)', () => {
    it('deve criar usuário com role COMMON para e-mail não-institucional', async () => {
      const result = await createUserService({
        name: 'João Silva',
        email: 'joao@example.com',
        password: 'senha123',
      })

      expect(result.role).toBe('COMMON')
      expect(vi.mocked(createUser)).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'COMMON' }),
      )
    })

    it('deve definir emailVerified como true para usuário COMMON', async () => {
      const result = await createUserService({
        name: 'João',
        email: 'joao@gmail.com',
        password: 'senha123',
      })

      expect(result.emailVerified).toBe(true)
      expect(vi.mocked(createUser)).toHaveBeenCalledWith(
        expect.objectContaining({ emailVerified: true }),
      )
    })
  })

  describe('cadastro de usuário INSTITUTIONALIZED (RF02)', () => {
    it('deve criar usuário com role INSTITUTIONALIZED para e-mail @dcx.ufpb.br', async () => {
      vi.mocked(createUser).mockResolvedValue(
        makeMockUser({ email: 'aluno@dcx.ufpb.br', role: 'INSTITUTIONALIZED', emailVerified: false }),
      )

      const result = await createUserService({
        name: 'Aluno UFPB',
        email: 'aluno@dcx.ufpb.br',
        password: 'senha123',
      })

      expect(result.role).toBe('INSTITUTIONALIZED')
      expect(vi.mocked(createUser)).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'INSTITUTIONALIZED', emailVerified: false }),
      )
    })

    it('deve definir emailVerified como false para usuário institucional', async () => {
      vi.mocked(createUser).mockResolvedValue(
        makeMockUser({ email: 'aluno@dcx.ufpb.br', role: 'INSTITUTIONALIZED', emailVerified: false }),
      )

      const result = await createUserService({
        name: 'Aluno',
        email: 'aluno@dcx.ufpb.br',
        password: 'senha123',
      })

      expect(result.emailVerified).toBe(false)
    })

    it('deve detectar domínio institucional case-insensitive', async () => {
      await createUserService({
        name: 'Aluno',
        email: 'aluno@DCX.UFPB.BR',
        password: 'senha123',
      })

      expect(vi.mocked(createUser)).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'INSTITUTIONALIZED' }),
      )
    })
  })

  describe('segurança (RNF01)', () => {
    it('nunca deve retornar passwordHash na resposta', async () => {
      const result = await createUserService({
        name: 'João',
        email: 'joao@example.com',
        password: 'senha123',
      })

      expect(result).not.toHaveProperty('passwordHash')
    })

    it('deve chamar hashPassword antes de criar o usuário', async () => {
      await createUserService({
        name: 'João',
        email: 'joao@example.com',
        password: 'minha_senha',
      })

      expect(vi.mocked(hashPassword)).toHaveBeenCalledWith('minha_senha')
      expect(vi.mocked(createUser)).toHaveBeenCalledWith(
        expect.objectContaining({ passwordHash: 'hashed_password' }),
      )
    })
  })

  describe('unicidade de e-mail', () => {
    it('deve lançar GeneralErrorResponse 409 quando e-mail já existe', async () => {
      vi.mocked(findUserByEmail).mockResolvedValue(makeMockUser())

      await expect(
        createUserService({ name: 'João', email: 'joao@example.com', password: 'senha123' }),
      ).rejects.toThrow(GeneralErrorResponse)
    })

    it('deve retornar statusCode 409 e code EMAIL_ALREADY_EXISTS', async () => {
      vi.mocked(findUserByEmail).mockResolvedValue(makeMockUser())

      const error = await createUserService({
        name: 'João',
        email: 'joao@example.com',
        password: 'senha123',
      }).catch((e: unknown) => e)

      expect(error).toBeInstanceOf(GeneralErrorResponse)
      expect((error as GeneralErrorResponse).statusCode).toBe(409)
      expect((error as GeneralErrorResponse).code).toBe('EMAIL_ALREADY_EXISTS')
    })

    it('não deve chamar createUser quando e-mail já existe', async () => {
      vi.mocked(findUserByEmail).mockResolvedValue(makeMockUser())

      await createUserService({
        name: 'João',
        email: 'joao@example.com',
        password: 'senha123',
      }).catch(() => {})

      expect(vi.mocked(createUser)).not.toHaveBeenCalled()
    })
  })

  describe('auditoria (RNF05)', () => {
    it('deve registrar AuditLog após criar o usuário', async () => {
      await createUserService({ name: 'João', email: 'joao@example.com', password: 'senha123' })

      expect(vi.mocked(createAuditLog)).toHaveBeenCalledOnce()
      expect(vi.mocked(createAuditLog)).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'user-uuid-123',
          targetId: 'user-uuid-123',
          action: 'USER_REGISTERED',
        }),
      )
    })

    it('não deve chamar createAuditLog quando e-mail já existe', async () => {
      vi.mocked(findUserByEmail).mockResolvedValue(makeMockUser())

      await createUserService({
        name: 'João',
        email: 'joao@example.com',
        password: 'senha123',
      }).catch(() => {})

      expect(vi.mocked(createAuditLog)).not.toHaveBeenCalled()
    })
  })

  describe('logging de console (pino)', () => {
    it('deve logar "IN - createUserService" ao iniciar', async () => {
      await createUserService({ name: 'João', email: 'joao@example.com', password: 'senha123' })

      expect(vi.mocked(logger.info)).toHaveBeenCalledWith('IN - createUserService')
    })

    it('deve logar "OUT - createUserService" ao concluir', async () => {
      await createUserService({ name: 'João', email: 'joao@example.com', password: 'senha123' })

      expect(vi.mocked(logger.info)).toHaveBeenCalledWith('OUT - createUserService')
    })

    it('deve logar IN antes de OUT', async () => {
      await createUserService({ name: 'João', email: 'joao@example.com', password: 'senha123' })

      const calls = vi.mocked(logger.info).mock.calls.map((c) => c[0])
      const inIndex = calls.indexOf('IN - createUserService')
      const outIndex = calls.indexOf('OUT - createUserService')

      expect(inIndex).toBeLessThan(outIndex)
    })

    it('deve logar IN mesmo quando ocorre erro (e-mail duplicado)', async () => {
      vi.mocked(findUserByEmail).mockResolvedValue(makeMockUser())

      await createUserService({
        name: 'João',
        email: 'joao@example.com',
        password: 'senha123',
      }).catch(() => {})

      expect(vi.mocked(logger.info)).toHaveBeenCalledWith('IN - createUserService')
    })

    it('não deve logar a senha em nenhum momento', async () => {
      await createUserService({
        name: 'João',
        email: 'joao@example.com',
        password: 'senha_super_secreta',
      })

      const allLogCalls = [
        ...vi.mocked(logger.info).mock.calls,
        ...vi.mocked(logger.error).mock.calls,
      ]
      const allLoggedStrings = JSON.stringify(allLogCalls)

      expect(allLoggedStrings).not.toContain('senha_super_secreta')
    })
  })
})
