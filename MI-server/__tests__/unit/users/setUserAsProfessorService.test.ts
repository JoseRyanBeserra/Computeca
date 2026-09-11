// __tests__/unit/users/setUserAsProfessorService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ──────────────────────────────────────────────────────────────────────
vi.mock('../../../src/repositories/users/usersRepository', () => ({
  findUserById: vi.fn(),
  updateUser:   vi.fn(),
}))

vi.mock('../../../src/repositories/audit/auditRepository', () => ({
  createAuditLog: vi.fn(),
}))

vi.mock('../../../src/lib/logger', () => ({
  logger: {
    info:  vi.fn(),
    error: vi.fn(),
    warn:  vi.fn(),
    debug: vi.fn(),
  },
}))

import { setUserAsProfessorService } from '../../../src/services/users/setUserAsProfessorService'
import { findUserById, updateUser }   from '../../../src/repositories/users/usersRepository'
import { createAuditLog }             from '../../../src/repositories/audit/auditRepository'
import { logger }                     from '../../../src/lib/logger'
import { GeneralErrorResponse }       from '../../../src/errors/GeneralErrorResponse'

// ── Helpers ────────────────────────────────────────────────────────────────────

const TARGET_ID = 'a0b1c2d3-e4f5-6789-abcd-ef0123456789'
const ADMIN_ID  = 'f1e2d3c4-b5a6-7890-bcde-f01234567890'

const VALID_INPUT = { targetUserId: TARGET_ID, requestingAdminId: ADMIN_ID }

function makeMockUser(overrides: Record<string, unknown> = {}) {
  return {
    id:           TARGET_ID,
    name:         'Carlos Comum',
    email:        'carlos@example.com',
    passwordHash: 'hashed_pw',
    role:         'COMMON' as const,
    canUpload:    false,
    emailVerified: true,
    suspended:    false,
    createdAt:    new Date('2026-01-01T00:00:00Z'),
    updatedAt:    new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  }
}

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()

  vi.mocked(findUserById).mockResolvedValue(makeMockUser())
  vi.mocked(updateUser).mockResolvedValue(makeMockUser({ role: 'PROFESSOR' }))
  vi.mocked(createAuditLog).mockResolvedValue(undefined)
})

// ── Testes ─────────────────────────────────────────────────────────────────────

describe('setUserAsProfessorService', () => {
  describe('promoção de usuário (fluxo de sucesso)', () => {
    it('deve chamar updateUser com role PROFESSOR', async () => {
      await setUserAsProfessorService(VALID_INPUT)

      expect(vi.mocked(updateUser)).toHaveBeenCalledWith(TARGET_ID, { role: 'PROFESSOR' })
    })

    it('deve retornar usuário com role PROFESSOR', async () => {
      const result = await setUserAsProfessorService(VALID_INPUT)

      expect(result.role).toBe('PROFESSOR')
    })

    it('deve buscar o usuário pelo targetUserId', async () => {
      await setUserAsProfessorService(VALID_INPUT)

      expect(vi.mocked(findUserById)).toHaveBeenCalledWith(TARGET_ID)
    })

    it('deve funcionar para usuário com role INSTITUTIONALIZED', async () => {
      vi.mocked(findUserById).mockResolvedValue(makeMockUser({ role: 'INSTITUTIONALIZED' }))

      await setUserAsProfessorService(VALID_INPUT)

      expect(vi.mocked(updateUser)).toHaveBeenCalledWith(TARGET_ID, { role: 'PROFESSOR' })
    })
  })

  describe('segurança (RNF01)', () => {
    it('nunca deve retornar passwordHash na resposta', async () => {
      const result = await setUserAsProfessorService(VALID_INPUT)

      expect(result).not.toHaveProperty('passwordHash')
    })

    it('deve retornar todos os outros campos do usuário', async () => {
      const result = await setUserAsProfessorService(VALID_INPUT)

      expect(result).toMatchObject({
        id:           TARGET_ID,
        name:         'Carlos Comum',
        email:        'carlos@example.com',
        role:         'PROFESSOR',
        canUpload:    false,
        emailVerified: true,
        suspended:    false,
      })
    })
  })

  describe('erros de negócio', () => {
    it('deve lançar GeneralErrorResponse 404 quando usuário não existe', async () => {
      vi.mocked(findUserById).mockResolvedValue(null)

      const error = await setUserAsProfessorService(VALID_INPUT).catch((e) => e)

      expect(error).toBeInstanceOf(GeneralErrorResponse)
      expect((error as GeneralErrorResponse).statusCode).toBe(404)
      expect((error as GeneralErrorResponse).code).toBe('USER_NOT_FOUND')
    })

    it('deve lançar GeneralErrorResponse 403 quando target tem role ADMIN', async () => {
      vi.mocked(findUserById).mockResolvedValue(makeMockUser({ role: 'ADMIN' }))

      const error = await setUserAsProfessorService(VALID_INPUT).catch((e) => e)

      expect(error).toBeInstanceOf(GeneralErrorResponse)
      expect((error as GeneralErrorResponse).statusCode).toBe(403)
      expect((error as GeneralErrorResponse).code).toBe('FORBIDDEN')
    })

    it('não deve chamar updateUser quando usuário não existe', async () => {
      vi.mocked(findUserById).mockResolvedValue(null)

      await setUserAsProfessorService(VALID_INPUT).catch(() => {})

      expect(vi.mocked(updateUser)).not.toHaveBeenCalled()
    })

    it('não deve chamar updateUser quando target é ADMIN', async () => {
      vi.mocked(findUserById).mockResolvedValue(makeMockUser({ role: 'ADMIN' }))

      await setUserAsProfessorService(VALID_INPUT).catch(() => {})

      expect(vi.mocked(updateUser)).not.toHaveBeenCalled()
    })
  })

  describe('auditoria (RNF05)', () => {
    it('deve registrar AuditLog com action USER_PROMOTED_TO_PROFESSOR', async () => {
      await setUserAsProfessorService(VALID_INPUT)

      expect(vi.mocked(createAuditLog)).toHaveBeenCalledWith(
        expect.objectContaining({
          action:   'USER_PROMOTED_TO_PROFESSOR',
          actorId:  ADMIN_ID,
          targetId: TARGET_ID,
        }),
      )
    })

    it('deve registrar AuditLog com actorRole ADMIN', async () => {
      await setUserAsProfessorService(VALID_INPUT)

      expect(vi.mocked(createAuditLog)).toHaveBeenCalledWith(
        expect.objectContaining({ actorRole: 'ADMIN' }),
      )
    })

    it('deve registrar metadata com previousRole e newRole corretos', async () => {
      vi.mocked(findUserById).mockResolvedValue(makeMockUser({ role: 'INSTITUTIONALIZED' }))

      await setUserAsProfessorService(VALID_INPUT)

      expect(vi.mocked(createAuditLog)).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: { previousRole: 'INSTITUTIONALIZED', newRole: 'PROFESSOR' },
        }),
      )
    })

    it('deve registrar previousRole COMMON quando usuário era COMMON', async () => {
      await setUserAsProfessorService(VALID_INPUT)

      expect(vi.mocked(createAuditLog)).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: { previousRole: 'COMMON', newRole: 'PROFESSOR' },
        }),
      )
    })

    it('não deve criar AuditLog quando usuário não existe', async () => {
      vi.mocked(findUserById).mockResolvedValue(null)

      await setUserAsProfessorService(VALID_INPUT).catch(() => {})

      expect(vi.mocked(createAuditLog)).not.toHaveBeenCalled()
    })

    it('não deve criar AuditLog quando target é ADMIN', async () => {
      vi.mocked(findUserById).mockResolvedValue(makeMockUser({ role: 'ADMIN' }))

      await setUserAsProfessorService(VALID_INPUT).catch(() => {})

      expect(vi.mocked(createAuditLog)).not.toHaveBeenCalled()
    })
  })

  describe('validação de entrada', () => {
    it('deve lançar erro quando targetUserId não é UUID válido', async () => {
      await expect(
        setUserAsProfessorService({ ...VALID_INPUT, targetUserId: 'nao-e-uuid' }),
      ).rejects.toThrow()
    })

    it('deve lançar erro quando requestingAdminId não é UUID válido', async () => {
      await expect(
        setUserAsProfessorService({ ...VALID_INPUT, requestingAdminId: 'invalido' }),
      ).rejects.toThrow()
    })

    it('deve lançar erro quando targetUserId está ausente', async () => {
      await expect(
        setUserAsProfessorService({ requestingAdminId: ADMIN_ID }),
      ).rejects.toThrow()
    })

    it('deve lançar erro quando requestingAdminId está ausente', async () => {
      await expect(
        setUserAsProfessorService({ targetUserId: TARGET_ID }),
      ).rejects.toThrow()
    })
  })

  describe('logging de console (pino)', () => {
    it('deve logar "IN - setUserAsProfessorService" ao iniciar', async () => {
      await setUserAsProfessorService(VALID_INPUT)

      expect(vi.mocked(logger.info)).toHaveBeenCalledWith('IN - setUserAsProfessorService')
    })

    it('deve logar "OUT - setUserAsProfessorService" ao concluir', async () => {
      await setUserAsProfessorService(VALID_INPUT)

      expect(vi.mocked(logger.info)).toHaveBeenCalledWith('OUT - setUserAsProfessorService')
    })

    it('deve logar IN antes de OUT', async () => {
      await setUserAsProfessorService(VALID_INPUT)

      const calls = vi.mocked(logger.info).mock.calls.map((c) => c[0])
      const inIdx  = calls.indexOf('IN - setUserAsProfessorService')
      const outIdx = calls.indexOf('OUT - setUserAsProfessorService')
      expect(inIdx).toBeGreaterThanOrEqual(0)
      expect(inIdx).toBeLessThan(outIdx)
    })

    it('deve logar IN mesmo quando ocorre erro de negócio', async () => {
      vi.mocked(findUserById).mockResolvedValue(null)

      await setUserAsProfessorService(VALID_INPUT).catch(() => {})

      expect(vi.mocked(logger.info)).toHaveBeenCalledWith('IN - setUserAsProfessorService')
    })
  })
})
