// src/middlewares/requireAiEnabled.ts
import type { FastifyReply, FastifyRequest } from 'fastify'
import { ERRORS, buildError } from '../lib/errors/errors'
import { GeneralErrorResponse } from '../errors/GeneralErrorResponse'
import { StatusCode } from '../utils/statusCode'
import { isAiEnabled } from '../constants/features'

/**
 * Garante que as funcionalidades de IA estejam disponíveis nesta instalação.
 *
 * Deve ser usado **após** `authenticate`: quem não está autenticado recebe
 * `401`, não `503`. A indisponibilidade de um recurso só é informada a quem
 * teria direito de usá-lo.
 *
 * A recusa acontece aqui, antes do controller, então nenhum token de IA é
 * consumido e nenhuma chamada externa é emitida.
 *
 * Lança `503 AI_DISABLED` quando a IA está desativada em qualquer dos dois
 * níveis — ambiente ou painel administrativo.
 */
export async function requireAiEnabled(
  _request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  if (!(await isAiEnabled())) {
    throw new GeneralErrorResponse(
      StatusCode.SERVICE_UNAVAILABLE,
      buildError(ERRORS.AI.AI_DISABLED),
    )
  }
}
