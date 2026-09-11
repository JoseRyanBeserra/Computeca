// __tests__/unit/auth/emailVerificationTracing.test.ts
//
// Mesmo contrato de privacidade do login, aplicado ao fluxo de verificação de
// e-mail: o código enviado é credencial e não pode aparecer nos spans, nem o
// endereço de e-mail completo.
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ──────────────────────────────────────────────────────────────────────

const { atributosCapturados, nomesDeSpan } = vi.hoisted(() => ({
  atributosCapturados: [] as unknown[],
  nomesDeSpan:         [] as string[],
}))

vi.mock('../../../src/lib/tracing', () => ({
  withSpan: vi.fn(async (name: string, attrs: unknown, fn: (span: unknown) => unknown) => {
    nomesDeSpan.push(name)
    atributosCapturados.push(attrs)
    return fn({
      setAttribute: (k: string, v: unknown) => atributosCapturados.push({ [k]: v }),
    })
  }),
  withSpanSync: vi.fn((name: string, attrs: unknown, fn: (span: unknown) => unknown) => {
    nomesDeSpan.push(name)
    atributosCapturados.push(attrs)
    return fn({
      setAttribute: (k: string, v: unknown) => atributosCapturados.push({ [k]: v }),
    })
  }),
}))

vi.mock('../../../src/repositories/auth/emailVerificationRepository', () => ({
  createEmailVerificationToken:            vi.fn(),
  findEmailVerificationToken:              vi.fn(),
  deleteEmailVerificationToken:            vi.fn(),
  deleteAllEmailVerificationTokensForUser: vi.fn(),
}))

vi.mock('../../../src/lib/mailer', () => ({ sendMail: vi.fn() }))

vi.mock('../../../src/database/prisma', () => ({
  prisma: { user: { update: vi.fn() } },
}))

vi.mock('../../../src/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))

import {
  sendVerificationEmailService,
  verifyEmailService,
} from '../../../src/services/auth/emailVerificationService'
import {
  createEmailVerificationToken,
  findEmailVerificationToken,
} from '../../../src/repositories/auth/emailVerificationRepository'
import { sendMail } from '../../../src/lib/mailer'

// ── Helpers ────────────────────────────────────────────────────────────────────

const USER_ID = 'cccccccc-0000-4000-8000-000000000003'
const EMAIL   = 'aluno@academico.ufpb.br'

function atributosSerializados(): string {
  return JSON.stringify(atributosCapturados)
}

/** Código realmente gerado pelo service, lido do que foi persistido. */
function codigoGerado(): string {
  return vi.mocked(createEmailVerificationToken).mock.calls[0][0].token
}

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  atributosCapturados.length = 0
  nomesDeSpan.length = 0
  vi.mocked(createEmailVerificationToken).mockReset()
  vi.mocked(findEmailVerificationToken).mockReset()
  vi.mocked(sendMail).mockReset()
})

// ── Testes ─────────────────────────────────────────────────────────────────────

describe('telemetria do envio de e-mail de verificação', () => {
  it('abre spans separados para geração do token e envio SMTP', async () => {
    await sendVerificationEmailService(USER_ID, EMAIL, 'Aluno Teste')

    expect(nomesDeSpan).toEqual([
      'auth.envio_email_verificacao',
      'auth.email_verificacao.gerar_token',
      'auth.email_verificacao.envio_smtp',
    ])
  })

  it('não expõe o código de verificação nem o e-mail completo nos spans', async () => {
    await sendVerificationEmailService(USER_ID, EMAIL, 'Aluno Teste')

    const serializado = atributosSerializados()
    expect(serializado).not.toContain(codigoGerado())
    expect(serializado).not.toContain(EMAIL)
    expect(serializado).toContain('academico.ufpb.br')
  })

  it('o código gerado é o mesmo que vai para o e-mail', async () => {
    await sendVerificationEmailService(USER_ID, EMAIL, 'Aluno Teste')

    const enviado = vi.mocked(sendMail).mock.calls[0][0]
    expect(enviado.text).toContain(codigoGerado())
    expect(enviado.to).toBe(EMAIL)
  })

  it('propaga a falha do SMTP para o span (mantendo o erro original)', async () => {
    vi.mocked(sendMail).mockRejectedValue(new Error('SMTP indisponível'))

    await expect(sendVerificationEmailService(USER_ID, EMAIL, 'Aluno Teste'))
      .rejects.toThrow('SMTP indisponível')

    expect(nomesDeSpan).toContain('auth.email_verificacao.envio_smtp')
  })
})

describe('telemetria da verificação do código', () => {
  it('classifica código inexistente sem vazar o código tentado', async () => {
    vi.mocked(findEmailVerificationToken).mockResolvedValue(null as never)

    await expect(verifyEmailService('123456')).rejects.toThrow()

    expect(atributosCapturados).toContainEqual({ 'auth.falha': 'codigo_inexistente' })
    expect(atributosSerializados()).not.toContain('123456')
  })

  it('classifica código expirado e registra o usuário', async () => {
    vi.mocked(findEmailVerificationToken).mockResolvedValue({
      userId:    USER_ID,
      expiresAt: new Date(Date.now() - 60_000),
    } as never)

    await expect(verifyEmailService('654321')).rejects.toThrow()

    expect(atributosCapturados).toContainEqual({ 'usuario.id': USER_ID })
    expect(atributosCapturados).toContainEqual({ 'auth.falha': 'codigo_expirado' })
    expect(atributosSerializados()).not.toContain('654321')
  })

  it('verifica com sucesso sem registrar falha', async () => {
    vi.mocked(findEmailVerificationToken).mockResolvedValue({
      userId:    USER_ID,
      expiresAt: new Date(Date.now() + 60_000),
    } as never)

    await verifyEmailService('999999')

    expect(atributosCapturados).toContainEqual({ 'usuario.id': USER_ID })
    expect(atributosSerializados()).not.toContain('auth.falha')
  })
})
