// __tests__/unit/auth/authTracing.test.ts
//
// Trava o contrato de privacidade da telemetria: spans dos fluxos de auth não
// podem carregar senha, e-mail completo, refresh token ou código de verificação.
// Traces vão para um backend de observabilidade — não é lugar de credencial.
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ──────────────────────────────────────────────────────────────────────

const { atributosCapturados } = vi.hoisted(() => ({ atributosCapturados: [] as unknown[] }))

// Captura tudo que é passado como atributo de span, tanto na abertura quanto
// via setAttribute durante a execução.
vi.mock('../../../src/lib/tracing', () => ({
  withSpan: vi.fn(async (_name: string, attrs: unknown, fn: (span: unknown) => unknown) => {
    atributosCapturados.push(attrs)
    return fn({
      setAttribute: (k: string, v: unknown) => atributosCapturados.push({ [k]: v }),
    })
  }),
  withSpanSync: vi.fn((_name: string, attrs: unknown, fn: (span: unknown) => unknown) => {
    atributosCapturados.push(attrs)
    return fn({
      setAttribute: (k: string, v: unknown) => atributosCapturados.push({ [k]: v }),
    })
  }),
}))

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
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))

import { loginService, refreshTokenService } from '../../../src/services/auth/authService'
import { findUserByEmail, findUserById } from '../../../src/repositories/users/usersRepository'
import { findRefreshToken } from '../../../src/repositories/auth/authRepository'
import { comparePassword } from '../../../src/utils/hash'

// ── Helpers ────────────────────────────────────────────────────────────────────

const EMAIL    = 'professor@dcx.ufpb.br'
const SENHA    = 'senha-super-secreta-123'
const TOKEN    = 'refresh-token-confidencial-xyz'
const USER_ID  = 'aaaaaaaa-0000-4000-8000-000000000001'

function usuarioValido() {
  return {
    id:            USER_ID,
    name:          'Professor Teste',
    email:         EMAIL,
    passwordHash:  '$2a$12$hash',
    role:          'PROFESSOR',
    canUpload:     true,
    suspended:     false,
    emailVerified: true,
  }
}

/** Todos os atributos capturados, serializados — para busca por substring. */
function atributosSerializados(): string {
  return JSON.stringify(atributosCapturados)
}

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  atributosCapturados.length = 0
  vi.mocked(findUserByEmail).mockReset()
  vi.mocked(findUserById).mockReset()
  vi.mocked(findRefreshToken).mockReset()
  vi.mocked(comparePassword).mockReset()
})

// ── Testes ─────────────────────────────────────────────────────────────────────

describe('telemetria do login — privacidade dos atributos', () => {
  it('não expõe senha nem e-mail completo nos spans, apenas o domínio', async () => {
    vi.mocked(findUserByEmail).mockResolvedValue(usuarioValido() as never)
    vi.mocked(comparePassword).mockResolvedValue(true as never)

    await loginService({ email: EMAIL, password: SENHA })

    const serializado = atributosSerializados()
    expect(serializado).not.toContain(SENHA)
    expect(serializado).not.toContain(EMAIL)
    expect(serializado).toContain('dcx.ufpb.br')
  })

  it('registra usuario.id e usuario.perfil no login bem-sucedido', async () => {
    vi.mocked(findUserByEmail).mockResolvedValue(usuarioValido() as never)
    vi.mocked(comparePassword).mockResolvedValue(true as never)

    await loginService({ email: EMAIL, password: SENHA })

    expect(atributosCapturados).toContainEqual({ 'usuario.id': USER_ID })
    expect(atributosCapturados).toContainEqual({ 'usuario.perfil': 'PROFESSOR' })
  })

  it('classifica a falha de senha incorreta sem vazar a senha tentada', async () => {
    vi.mocked(findUserByEmail).mockResolvedValue(usuarioValido() as never)
    vi.mocked(comparePassword).mockResolvedValue(false as never)

    await expect(loginService({ email: EMAIL, password: SENHA })).rejects.toThrow()

    expect(atributosCapturados).toContainEqual({ 'auth.falha': 'senha_incorreta' })
    expect(atributosSerializados()).not.toContain(SENHA)
  })

  it('classifica a falha de usuário inexistente', async () => {
    vi.mocked(findUserByEmail).mockResolvedValue(null as never)

    await expect(loginService({ email: EMAIL, password: SENHA })).rejects.toThrow()

    expect(atributosCapturados).toContainEqual({ 'auth.falha': 'usuario_inexistente' })
  })

  it('classifica conta suspensa e e-mail não verificado', async () => {
    vi.mocked(comparePassword).mockResolvedValue(true as never)

    vi.mocked(findUserByEmail).mockResolvedValue({ ...usuarioValido(), suspended: true } as never)
    await expect(loginService({ email: EMAIL, password: SENHA })).rejects.toThrow()
    expect(atributosCapturados).toContainEqual({ 'auth.falha': 'conta_suspensa' })

    atributosCapturados.length = 0
    vi.mocked(findUserByEmail).mockResolvedValue({ ...usuarioValido(), emailVerified: false } as never)
    await expect(loginService({ email: EMAIL, password: SENHA })).rejects.toThrow()
    expect(atributosCapturados).toContainEqual({ 'auth.falha': 'email_nao_verificado' })
  })
})

describe('telemetria do refresh token — privacidade dos atributos', () => {
  it('não expõe o refresh token nos spans', async () => {
    vi.mocked(findRefreshToken).mockResolvedValue({
      userId:    USER_ID,
      expiresAt: new Date(Date.now() + 60_000),
    } as never)
    vi.mocked(findUserById).mockResolvedValue(usuarioValido() as never)

    await refreshTokenService(TOKEN)

    expect(atributosSerializados()).not.toContain(TOKEN)
    expect(atributosCapturados).toContainEqual({ 'usuario.id': USER_ID })
  })

  it('classifica token expirado', async () => {
    vi.mocked(findRefreshToken).mockResolvedValue({
      userId:    USER_ID,
      expiresAt: new Date(Date.now() - 60_000),
    } as never)

    await expect(refreshTokenService(TOKEN)).rejects.toThrow()

    expect(atributosCapturados).toContainEqual({ 'auth.falha': 'token_expirado' })
    expect(atributosSerializados()).not.toContain(TOKEN)
  })

  it('classifica token inexistente', async () => {
    vi.mocked(findRefreshToken).mockResolvedValue(null as never)

    await expect(refreshTokenService(TOKEN)).rejects.toThrow()

    expect(atributosCapturados).toContainEqual({ 'auth.falha': 'token_inexistente' })
  })
})
