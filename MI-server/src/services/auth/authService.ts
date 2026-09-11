// src/services/auth/authService.ts
import { type IAuthUser } from '../../@types/auth'
import { type LoginRequest } from '../../schemas/auth/authSchema'
import { findUserByEmail, findUserById } from '../../repositories/users/usersRepository'
import {
  findRefreshToken,
  deleteRefreshToken,
} from '../../repositories/auth/authRepository'
import { createAuditLog } from '../../repositories/audit/auditRepository'
import { comparePassword } from '../../utils/hash'
import { ERRORS, buildError } from '../../lib/errors/errors'
import { GeneralErrorResponse } from '../../errors/GeneralErrorResponse'
import { StatusCode } from '../../utils/statusCode'
import { logger } from '../../lib/logger'
import { withSpan } from '../../lib/tracing'

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Extrai apenas o domínio do e-mail para uso como atributo de span.
 * Traces são dados de operação, não de auditoria: o e-mail completo é PII e
 * não deve ser exportado para o backend de telemetria. O domínio já responde
 * a perguntas úteis ("logins institucionais vs. externos") sem identificar
 * ninguém — o vínculo com o usuário fica em `usuario.id`.
 */
function emailDomain(email: string): string {
  return email.split('@')[1] ?? 'desconhecido'
}

// ── loginService ───────────────────────────────────────────────────────────────

/**
 * Valida as credenciais do usuário e retorna seus dados públicos.
 * Intencionalmente usa a mesma mensagem para "usuário não encontrado"
 * e "senha incorreta" para não revelar quais e-mails existem no sistema.
 */
export async function loginService(input: LoginRequest): Promise<IAuthUser> {
  logger.info('IN - loginService')

  const { email, password } = input

  return withSpan('auth.login', { 'auth.email_dominio': emailDomain(email) }, async (spanLogin) => {
    const user = await findUserByEmail(email)
    if (!user) {
      spanLogin.setAttribute('auth.falha', 'usuario_inexistente')
      throw new GeneralErrorResponse(StatusCode.UNAUTHORIZED, buildError(ERRORS.USER.INVALID_CREDENTIALS))
    }

    spanLogin.setAttribute('usuario.id', user.id)

    // Comparação bcrypt — trabalho de CPU proporcional ao custo configurado em
    // BCRYPT_SALT_ROUNDS. É o único span pesado deste fluxo que não é I/O.
    const passwordMatch = await withSpan('auth.verificar_senha', {}, async () =>
      comparePassword(password, user.passwordHash),
    )

    if (!passwordMatch) {
      spanLogin.setAttribute('auth.falha', 'senha_incorreta')
      // Sem o e-mail nem a senha — só o domínio, pelo mesmo motivo dos spans.
      logger.warn(
        { evento: 'login_recusado', motivo: 'senha_incorreta', usuario_id: user.id, email_dominio: emailDomain(email) },
        'Login recusado',
      )
      throw new GeneralErrorResponse(StatusCode.UNAUTHORIZED, buildError(ERRORS.USER.INVALID_CREDENTIALS))
    }

    if (user.suspended) {
      spanLogin.setAttribute('auth.falha', 'conta_suspensa')
      throw new GeneralErrorResponse(StatusCode.FORBIDDEN, buildError(ERRORS.AUTH.ACCOUNT_SUSPENDED))
    }

    if (!user.emailVerified) {
      spanLogin.setAttribute('auth.falha', 'email_nao_verificado')
      throw new GeneralErrorResponse(StatusCode.FORBIDDEN, buildError(ERRORS.AUTH.EMAIL_NOT_VERIFIED))
    }

    await createAuditLog({
      actorId: user.id,
      actorRole: user.role,
      targetId: user.id,
      action: 'USER_LOGGED_IN',
      metadata: { email, role: user.role },
    })

    spanLogin.setAttribute('usuario.perfil', user.role)

    logger.info('OUT - loginService')

    logger.info(
      {
        evento:         'login_efetuado',
        usuario_id:     user.id,
        usuario_perfil: user.role,
        email_dominio:  emailDomain(email),
      },
      'Login efetuado',
    )

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      canUpload: user.canUpload,
    }
  })
}

// ── refreshTokenService ────────────────────────────────────────────────────────

/**
 * Valida um refresh token e retorna os dados do usuário associado.
 * Tokens expirados são deletados do banco antes de lançar o erro.
 */
export async function refreshTokenService(token: string): Promise<IAuthUser> {
  logger.info('IN - refreshTokenService')

  // O token em si nunca vira atributo de span — é credencial de sessão.
  return withSpan('auth.refresh_token', {}, async (spanRefresh) => {
    const stored = await findRefreshToken(token)
    if (!stored) {
      spanRefresh.setAttribute('auth.falha', 'token_inexistente')
      throw new GeneralErrorResponse(StatusCode.UNAUTHORIZED, buildError(ERRORS.AUTH.UNAUTHORIZED))
    }

    if (stored.expiresAt < new Date()) {
      spanRefresh.setAttribute('auth.falha', 'token_expirado')
      await deleteRefreshToken(token)
      throw new GeneralErrorResponse(StatusCode.UNAUTHORIZED, buildError(ERRORS.AUTH.UNAUTHORIZED))
    }

    spanRefresh.setAttribute('usuario.id', stored.userId)

    const user = await findUserById(stored.userId)
    if (!user || user.suspended) {
      spanRefresh.setAttribute('auth.falha', user ? 'conta_suspensa' : 'usuario_inexistente')
      throw new GeneralErrorResponse(StatusCode.UNAUTHORIZED, buildError(ERRORS.AUTH.UNAUTHORIZED))
    }

    spanRefresh.setAttribute('usuario.perfil', user.role)

    logger.info('OUT - refreshTokenService')

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      canUpload: user.canUpload,
    }
  })
}

// ── logoutService ──────────────────────────────────────────────────────────────

/**
 * Remove o refresh token do banco, invalidando a sessão no servidor.
 */
export async function logoutService(token: string): Promise<void> {
  logger.info('IN - logoutService')
  await deleteRefreshToken(token)
  logger.info('OUT - logoutService')
}
