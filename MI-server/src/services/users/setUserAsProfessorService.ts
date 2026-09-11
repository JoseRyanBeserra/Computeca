// src/services/users/setUserAsProfessorService.ts
import type { IUser } from '../../@types/users'
import { findUserById, updateUser } from '../../repositories/users/usersRepository'
import { createAuditLog } from '../../repositories/audit/auditRepository'
import { validateRequest } from '../../utils/validateRequest'
import { setUserAsProfessorSchema } from '../../schemas/users/setUserAsProfessorSchema'
import { ADMIN, PROFESSOR } from '../../constants/roles'
import { ERRORS, buildError } from '../../lib/errors/errors'
import { GeneralErrorResponse } from '../../errors/GeneralErrorResponse'
import { StatusCode } from '../../utils/statusCode'
import { logger } from '../../lib/logger'

export async function setUserAsProfessorService(input: unknown): Promise<IUser> {
  logger.info('IN - setUserAsProfessorService')

  const { targetUserId, requestingAdminId } = validateRequest(input, setUserAsProfessorSchema)

  const targetUser = await findUserById(targetUserId)

  if (!targetUser) {
    throw new GeneralErrorResponse(StatusCode.NOT_FOUND, buildError(ERRORS.USER.USER_NOT_FOUND))
  }

  // Impede que o cargo de ADMIN seja alterado
  if (targetUser.role === ADMIN) {
    throw new GeneralErrorResponse(StatusCode.FORBIDDEN, buildError(ERRORS.AUTH.FORBIDDEN))
  }

  const previousRole = targetUser.role

  const updated = await updateUser(targetUserId, { role: PROFESSOR })

  await createAuditLog({
    actorId:   requestingAdminId,
    actorRole: ADMIN,
    targetId:  targetUserId,
    action:    'USER_PROMOTED_TO_PROFESSOR',
    metadata:  { previousRole, newRole: PROFESSOR },
  })

  logger.info('OUT - setUserAsProfessorService')

  const { passwordHash: _omitted, ...safeUser } = updated
  return safeUser
}
