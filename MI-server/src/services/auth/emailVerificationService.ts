// src/services/auth/emailVerificationService.ts
import { prisma } from '../../database/prisma'
import {
  createEmailVerificationToken,
  findEmailVerificationToken,
  deleteEmailVerificationToken,
  deleteAllEmailVerificationTokensForUser,
} from '../../repositories/auth/emailVerificationRepository'
import { sendMail } from '../../lib/mailer'
import { ERRORS, buildError } from '../../lib/errors/errors'
import { GeneralErrorResponse } from '../../errors/GeneralErrorResponse'
import { StatusCode } from '../../utils/statusCode'
import { env } from '../../env'
import { logger } from '../../lib/logger'
import { withSpan } from '../../lib/tracing'

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

/**
 * Só o domínio do e-mail vai para os spans — o endereço completo é PII e o
 * código de verificação é credencial. Nenhum dos dois pode ser exportado
 * para o backend de telemetria.
 */
function emailDomain(email: string): string {
  return email.split('@')[1] ?? 'desconhecido'
}

// ── Service ───────────────────────────────────────────────────────────────────

export async function sendVerificationEmailService(
  userId: string,
  userEmail: string,
  userName: string,
): Promise<void> {
  return withSpan(
    'auth.envio_email_verificacao',
    {
      'usuario.id':               userId,
      'auth.email_dominio':       emailDomain(userEmail),
      'auth.token_expira_horas':  env.EMAIL_VERIFICATION_EXPIRES_HOURS,
    },
    async () => {
      // Invalida códigos anteriores e emite o novo — duas escritas no banco.
      const code = await withSpan('auth.email_verificacao.gerar_token', { 'usuario.id': userId }, async () => {
        await deleteAllEmailVerificationTokensForUser(userId)

        const novoCodigo = generateVerificationCode()
        const expiresAt  = new Date(Date.now() + env.EMAIL_VERIFICATION_EXPIRES_HOURS * 60 * 60 * 1000)
        await createEmailVerificationToken({ token: novoCodigo, userId, expiresAt })

        return novoCodigo
      })

      // O código é credencial. Em desenvolvimento é prático tê-lo no console
      // (permite testar o cadastro sem SMTP), mas em produção os logs saem da
      // máquina para o servidor de observabilidade — lá ele nunca pode aparecer.
      if (env.NODE_ENV !== 'production') {
        logger.info(`[DEV] Código de verificação para ${userEmail}: ${code}`)
      }

      // Envio SMTP — I/O externo, o ponto mais lento e mais propenso a falha
      // deste fluxo. Se o servidor de e-mail cair, o span sai em vermelho.
      await withSpan('auth.email_verificacao.envio_smtp', { 'auth.email_dominio': emailDomain(userEmail) }, async () => {
        await sendMail({
          to:      userEmail,
          subject: 'Seu código de verificação — MI UFPB',
          text:    buildVerificationEmailText(userName, code, env.EMAIL_VERIFICATION_EXPIRES_HOURS),
          html:    buildVerificationEmailHtml(userName, code, env.EMAIL_VERIFICATION_EXPIRES_HOURS),
        })
      })
    },
  )
}

export async function verifyEmailService(code: string): Promise<void> {
  // O código não vira atributo — é a credencial que autoriza a verificação.
  return withSpan('auth.verificar_email', {}, async (span) => {
    const record = await findEmailVerificationToken(code)

    if (!record) {
      span.setAttribute('auth.falha', 'codigo_inexistente')
      throw new GeneralErrorResponse(StatusCode.BAD_REQUEST, buildError(ERRORS.AUTH.INVALID_VERIFICATION_TOKEN))
    }

    span.setAttribute('usuario.id', record.userId)

    if (record.expiresAt < new Date()) {
      span.setAttribute('auth.falha', 'codigo_expirado')
      await deleteEmailVerificationToken(code)
      throw new GeneralErrorResponse(StatusCode.BAD_REQUEST, buildError(ERRORS.AUTH.INVALID_VERIFICATION_TOKEN))
    }

    await prisma.user.update({
      where: { id: record.userId },
      data:  { emailVerified: true },
    })

    await deleteEmailVerificationToken(code)
  })
}

// ── Templates de e-mail ───────────────────────────────────────────────────────

function buildVerificationEmailText(name: string, code: string, expiresHours: number): string {
  return [
    `Olá, ${name}!`,
    '',
    'Use o código abaixo para confirmar seu e-mail institucional no sistema MI UFPB:',
    '',
    `    ${code}`,
    '',
    `Este código expira em ${expiresHours} horas.`,
    'Se você não criou esta conta, ignore este e-mail.',
    '',
    'Campus IV · UFPB — Rio Tinto / Mamanguape',
  ].join('\n')
}

function buildVerificationEmailHtml(name: string, code: string, expiresHours: number): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 0">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">

        <tr>
          <td style="background:#4338ca;padding:28px 40px">
            <p style="margin:0;color:#fff;font-size:20px;font-weight:bold">MI</p>
            <p style="margin:4px 0 0;color:#a5b4fc;font-size:12px">Materiais Instrucionais · UFPB</p>
          </td>
        </tr>

        <tr>
          <td style="padding:36px 40px;text-align:center">
            <p style="margin:0 0 4px;color:#111827;font-size:18px;font-weight:bold">Olá, ${name}!</p>
            <p style="margin:0 0 28px;color:#6b7280;font-size:14px;line-height:1.6">
              Use o código abaixo para confirmar seu e-mail institucional.
            </p>

            <div style="background:#f5f3ff;border:2px dashed #6366f1;border-radius:12px;
                        padding:20px 32px;display:inline-block;margin-bottom:24px">
              <p style="margin:0;font-size:36px;font-weight:bold;letter-spacing:10px;color:#4338ca">
                ${code}
              </p>
            </div>

            <p style="margin:0;color:#9ca3af;font-size:12px">
              Digite este código na tela de verificação. Ele expira em ${expiresHours} horas.
            </p>
            <p style="margin:8px 0 0;color:#d1d5db;font-size:11px">
              Se você não criou esta conta, ignore este e-mail.
            </p>
          </td>
        </tr>

        <tr>
          <td style="background:#f9fafb;padding:16px 40px;border-top:1px solid #f3f4f6">
            <p style="margin:0;color:#d1d5db;font-size:11px">Campus IV · UFPB — Rio Tinto / Mamanguape</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}
