// src/controllers/auth/emailVerificationController.ts
import type { FastifyRequest, FastifyReply } from 'fastify'
import { verifyEmailService } from '../../services/auth/emailVerificationService'
import { httpResponse, httpError } from '../../utils/http'
import { StatusCode } from '../../utils/statusCode'
import { ERRORS, buildError } from '../../lib/errors/errors'
import { GeneralErrorResponse } from '../../errors/GeneralErrorResponse'
import { logger } from '../../lib/logger'

const ctx = 'emailVerificationController'

/**
 * POST /auth/verify-email
 * Body: { code: string }
 * Confirma o e-mail institucional do usuário a partir do código de 6 dígitos.
 */
export async function emailVerificationController(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  logger.info(`IN - ${ctx}`)

  try {
    const { code } = request.body as { code?: string }

    if (!code || code.trim().length === 0) {
      throw new GeneralErrorResponse(StatusCode.BAD_REQUEST, buildError(ERRORS.AUTH.INVALID_VERIFICATION_TOKEN))
    }

    await verifyEmailService(code.trim())

    httpResponse({ reply, statusCode: StatusCode.OK, data: { message: 'E-mail verificado com sucesso.' }, context: ctx })
  } catch (error) {
    httpError({ error, context: ctx })
  }
}
