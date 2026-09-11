// src/utils/statusCode.ts
// Constantes de status HTTP para uso nos controllers e utilitários.

export const StatusCode = {
  OK:                    200,
  CREATED:               201,
  NO_CONTENT:            204,
  BAD_REQUEST:           400,
  UNAUTHORIZED:          401,
  FORBIDDEN:             403,
  NOT_FOUND:             404,
  CONFLICT:              409,
  UNSUPPORTED_MEDIA_TYPE: 415,
  PAYLOAD_TOO_LARGE:     413,
  INTERNAL_SERVER_ERROR: 500,
} as const

export type StatusCodeValue = (typeof StatusCode)[keyof typeof StatusCode]
