// src/utils/authorizeByRole.ts
import { GeneralErrorResponse } from '../errors/GeneralErrorResponse'
import { ERRORS, buildError } from '../lib/errors/errors'
import { StatusCode } from './statusCode'

/**
 * Verifica se o cargo do usuário está entre os cargos permitidos.
 * Lança 403 FORBIDDEN caso não esteja.
 *
 * @param userRole     - Cargo atual do usuário (vindo do JWT ou do banco).
 * @param allowedRoles - Lista de cargos que têm acesso à operação.
 *
 * @example
 *   authorizeByRole(request.user.role, UPLOAD_ALLOWED_ROLES)
 *   authorizeByRole(user.role, [ROLES.PROFESSOR, ROLES.ADMIN])
 */
export function authorizeByRole(userRole: string, allowedRoles: readonly string[]): void {
  if (!allowedRoles.includes(userRole)) {
    throw new GeneralErrorResponse(StatusCode.FORBIDDEN, buildError(ERRORS.AUTH.FORBIDDEN))
  }
}
