// src/utils/validateUUID.ts
import { GeneralErrorResponse } from '../errors/GeneralErrorResponse'
import { ERRORS, buildError } from '../lib/errors/errors'
import { StatusCode } from './statusCode'

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * Valida se um identificador de usuário é utilizável:
 *   1. Lança 400 MISSING_ID se for null ou undefined.
 *   2. Lança 400 INVALID_ID_FORMAT se não for um UUID v4 válido.
 */
export function validateUserId(userId: string | null | undefined): asserts userId is string {
  if (userId === null || userId === undefined) {
    throw new GeneralErrorResponse(StatusCode.BAD_REQUEST, buildError(ERRORS.GENERAL.MISSING_ID))
  }

  if (!UUID_V4_REGEX.test(userId)) {
    throw new GeneralErrorResponse(StatusCode.BAD_REQUEST, buildError(ERRORS.GENERAL.INVALID_ID_FORMAT))
  }
}
