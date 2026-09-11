// src/services/users/usersService.ts
import { type Role } from '@prisma/client'
import { type IUser } from '../../@types/users'
import { type CreateUserRequest } from '../../schemas/users/usersSchema'
import {
  findUserByEmail,
  createUser,
  updateUser,
} from '../../repositories/users/usersRepository'
import { createAuditLog } from '../../repositories/audit/auditRepository'
import { hashPassword } from '../../utils/hash'
import { ERRORS, buildError } from '../../lib/errors/errors'
import { GeneralErrorResponse } from '../../errors/GeneralErrorResponse'
import { StatusCode } from '../../utils/statusCode'
import { sendVerificationEmailService } from '../auth/emailVerificationService'
import { logger } from '../../lib/logger'

const INSTITUTIONAL_DOMAIN = '@dcx.ufpb.br'

export async function createUserService(
  input: CreateUserRequest,
): Promise<IUser> {
  const { name, email, password } = input

  logger.info('IN - createUserService')

  // RF01/RF02 — e-mail único
  const existing = await findUserByEmail(email)
  if (existing) {
    // Conta não verificada: permite nova tentativa atualizando dados e reenviando o e-mail
    if (!existing.emailVerified) {
      const passwordHash = await hashPassword(password)
      const updated = await updateUser(existing.id, { name, passwordHash })

      sendVerificationEmailService(updated.id, updated.email, updated.name).catch((err) =>
        logger.error({ err }, 'createUserService: falha ao reenviar e-mail de verificação'),
      )

      const { passwordHash: _removed, ...safeUser } = updated
      return safeUser
    }

    throw new GeneralErrorResponse(StatusCode.CONFLICT, buildError(ERRORS.USER.EMAIL_ALREADY_EXISTS))
  }

  // RF02 — detecção de domínio institucional
  const isInstitutional = email.toLowerCase().endsWith(INSTITUTIONAL_DOMAIN)
  const role: Role = isInstitutional ? 'INSTITUTIONALIZED' : 'COMMON'

  // RF01 — acesso imediato para COMMON; INSTITUTIONALIZED aguarda verificação
  const emailVerified = !isInstitutional

  // RNF01 — hash da senha antes de persistir
  const passwordHash = await hashPassword(password)

  const user = await createUser({ name, email, passwordHash, role, emailVerified })

  // RNF05 — registro de auditoria imutável no banco
  await createAuditLog({
    actorId: user.id,
    actorRole: user.role,
    targetId: user.id,
    action: 'USER_REGISTERED',
    metadata: { email, role },
  })

  // Envia e-mail de verificação para usuários institucionalizados
  if (isInstitutional) {
    // Fire-and-forget: falha no envio não bloqueia o cadastro
    sendVerificationEmailService(user.id, user.email, user.name).catch((err) =>
      logger.error({ err }, 'createUserService: falha ao enviar e-mail de verificação'),
    )
  }

  // Nunca retorna o hash da senha
  const { passwordHash: _removed, ...safeUser } = user

  logger.info('OUT - createUserService')

  return safeUser
}
