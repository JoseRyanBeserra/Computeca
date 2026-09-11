// src/middlewares/requireUploadPermission.ts
import type { FastifyReply, FastifyRequest } from 'fastify'
import { ERRORS, buildError } from '../lib/errors/errors'
import { GeneralErrorResponse } from '../errors/GeneralErrorResponse'
import { StatusCode } from '../utils/statusCode'
import { INSTITUTIONALIZED, PROFESSOR, ADMIN } from '../constants/roles'

/**
 * Garante que o usuário autenticado possa fazer upload.
 * Permitido se o role já concede acesso (INSTITUTIONALIZED, PROFESSOR, ADMIN)
 * ou se a flag canUpload foi explicitamente concedida (para COMMON).
 * Deve ser usado APÓS o middleware `authenticate`.
 *
 * Lança 403 UPLOAD_NOT_ALLOWED se a permissão não for concedida.
 */
export async function requireUploadPermission(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  const { role, canUpload } = request.user
  if (!([INSTITUTIONALIZED, PROFESSOR, ADMIN] as string[]).includes(role) && !canUpload) {
    throw new GeneralErrorResponse(StatusCode.FORBIDDEN, buildError(ERRORS.ERRORS_RESOURCES.UPLOAD_NOT_ALLOWED))
  }
}
