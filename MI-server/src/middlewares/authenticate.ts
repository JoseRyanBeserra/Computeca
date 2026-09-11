// src/middlewares/authenticate.ts
import type { FastifyReply, FastifyRequest } from 'fastify'
import { ERRORS, buildError } from '../lib/errors/errors'
import { GeneralErrorResponse } from '../errors/GeneralErrorResponse'
import { StatusCode } from '../utils/statusCode'

export interface JWTPayload {
  sub: string
  role: string
  canUpload: boolean
}

// Extensão do tipo do payload JWT via @fastify/jwt (forma canônica no v10+)
declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: JWTPayload
  }
}

export async function authenticate(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  try {
    await request.jwtVerify<JWTPayload>()
  } catch {
    throw new GeneralErrorResponse(StatusCode.UNAUTHORIZED, buildError(ERRORS.AUTH.UNAUTHORIZED))
  }
}
