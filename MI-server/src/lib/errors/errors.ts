// src/lib/errors/errors.ts
// Catálogo central de erros da aplicação.
//
// Uso:
//   throw new GeneralErrorResponse(StatusCode.UNAUTHORIZED, buildError(ERRORS.USER.INVALID_CREDENTIALS))
//   throw new GeneralErrorResponse(StatusCode.UNAUTHORIZED, buildError(ERRORS.AUTH.UNAUTHORIZED, 'en-US'))
//   throw new GeneralErrorResponse(StatusCode.BAD_REQUEST, buildError(ERRORS.GENERAL.BAD_REQUEST))

import { type ErrorParams } from '../../errors/GeneralErrorResponse'
import { errorMessages, type ErrorMessageKey, type Language } from './errorMessages'

// ── buildError ─────────────────────────────────────────────────────────────────

/**
 * Constrói os parâmetros de mensagem e código para `new GeneralErrorResponse(...)`.
 * O status HTTP é passado explicitamente como primeiro argumento da exceção.
 *
 * @param code   - Chave do erro (use as constantes de `ERRORS`)
 * @param lang   - Idioma da mensagem (padrão: 'pt-BR')
 *
 * @example
 *   throw new GeneralErrorResponse(StatusCode.UNAUTHORIZED, buildError(ERRORS.USER.INVALID_CREDENTIALS))
 *   throw new GeneralErrorResponse(StatusCode.FORBIDDEN,    buildError(ERRORS.AUTH.UNAUTHORIZED, 'en-US'))
 */
export function buildError(code: ErrorMessageKey, lang: Language = 'pt-BR'): ErrorParams {
  return {
    message: errorMessages[lang][code],
    code,
  }
}

// ── ERRORS — códigos organizados por domínio ───────────────────────────────────

export const ERRORS = {
  USER: {
    EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',
    USER_NOT_FOUND:       'USER_NOT_FOUND',
    INVALID_CREDENTIALS:  'INVALID_CREDENTIALS',
  },
  AUTH: {
    UNAUTHORIZED:               'UNAUTHORIZED',
    FORBIDDEN:                  'FORBIDDEN',
    ACCOUNT_SUSPENDED:          'ACCOUNT_SUSPENDED',
    EMAIL_NOT_VERIFIED:         'EMAIL_NOT_VERIFIED',
    INVALID_VERIFICATION_TOKEN: 'INVALID_VERIFICATION_TOKEN',
  },
  ERRORS_RESOURCES: {
    UPLOAD_NOT_ALLOWED:   'UPLOAD_NOT_ALLOWED',
    INVALID_FILE_TYPE:    'INVALID_FILE_TYPE',
    FILE_TOO_LARGE:       'FILE_TOO_LARGE',
    UPLOAD_FAILED:        'UPLOAD_FAILED',
    MI_NOT_FOUND:         'MI_NOT_FOUND',
    MI_NOT_OWNED_BY_USER: 'MI_NOT_OWNED_BY_USER',
    MI_NOT_PENDING:       'MI_NOT_PENDING',
    MI_NOT_APPROVED:      'MI_NOT_APPROVED',
    MI_NOT_VECTORIZED:    'MI_NOT_VECTORIZED',
    MI_SUMMARY_EMPTY:     'MI_SUMMARY_EMPTY',
  },
  ORG: {
    ORG_NOT_FOUND:            'ORG_NOT_FOUND',
    ORG_ARCHIVED:             'ORG_ARCHIVED',
    ORG_NOT_MEMBER:           'ORG_NOT_MEMBER',
    ORG_ALREADY_MEMBER:       'ORG_ALREADY_MEMBER',
    ORG_NOT_STAFF:            'ORG_NOT_STAFF',
    INVITE_NOT_FOUND:         'INVITE_NOT_FOUND',
    INVITE_NOT_PENDING:       'INVITE_NOT_PENDING',
    INVITE_ALREADY_PENDING:   'INVITE_ALREADY_PENDING',
    INVITE_ONLY_INSTITUTIONAL: 'INVITE_ONLY_INSTITUTIONAL',
  },
  CHAT: {
    CHAT_PROMPT_INJECTION: 'CHAT_PROMPT_INJECTION',
    CHAT_CONTENT_FLAGGED:  'CHAT_CONTENT_FLAGGED',
  },
  GENERAL: {
    BAD_REQUEST:          'BAD_REQUEST',
    INTERNAL_ERROR:       'INTERNAL_ERROR',
    MISSING_ID:           'MISSING_ID',
    INVALID_ID_FORMAT:    'INVALID_ID_FORMAT',
  },
} as const satisfies Record<string, Record<string, ErrorMessageKey>>
