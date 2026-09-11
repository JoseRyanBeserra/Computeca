// __tests__/unit/errors/errorHandler.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { z, ZodError } from 'zod'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { errorHandler } from '../../../src/errors/errorHandler'
import { GeneralErrorResponse } from '../../../src/errors/GeneralErrorResponse'
import { StatusCode } from '../../../src/utils/statusCode'

function makeReply() {
  const reply = {
    status: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  }
  return reply as unknown as FastifyReply & { status: ReturnType<typeof vi.fn>; send: ReturnType<typeof vi.fn> }
}

const request = {} as FastifyRequest

describe('errorHandler', () => {
  beforeEach(() => {
    // Silencia o console.error do ramo genérico (500)
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  it('mapeia ZodError para 422', () => {
    const reply = makeReply()
    let zodErr: ZodError
    try {
      z.object({ name: z.string() }).parse({})
      throw new Error('não lançou')
    } catch (e) {
      zodErr = e as ZodError
    }

    errorHandler(zodErr!, request, reply)

    expect(reply.status).toHaveBeenCalledWith(422)
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'error', message: 'Validation error' }),
    )
  })

  it('mapeia GeneralErrorResponse para o statusCode informado', () => {
    const reply = makeReply()
    const err = new GeneralErrorResponse(StatusCode.NOT_FOUND, { message: 'Não achado', code: 'NOT_FOUND' })

    errorHandler(err, request, reply)

    expect(reply.status).toHaveBeenCalledWith(404)
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'error', message: 'Não achado', code: 'NOT_FOUND' }),
    )
  })

  it('mapeia FST_REQ_FILE_TOO_LARGE para 413', () => {
    const reply = makeReply()
    const err = Object.assign(new Error('too large'), { code: 'FST_REQ_FILE_TOO_LARGE' })

    errorHandler(err, request, reply)

    expect(reply.status).toHaveBeenCalledWith(413)
    expect(reply.send).toHaveBeenCalledWith(expect.objectContaining({ code: 'FILE_TOO_LARGE' }))
  })

  it('mapeia FST_ERR_VALIDATION (schema de rota) para 422', () => {
    const reply = makeReply()
    const err = Object.assign(new Error('body/name inválido'), {
      code: 'FST_ERR_VALIDATION',
      statusCode: 400,
      validation: [{ instancePath: '/name', message: 'inválido' }],
    })

    errorHandler(err, request, reply)

    expect(reply.status).toHaveBeenCalledWith(422)
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'error',
        message: 'Validation error',
        issues: err.validation,
      }),
    )
  })

  it('mapeia erro desconhecido para 500', () => {
    const reply = makeReply()

    errorHandler(new Error('boom'), request, reply)

    expect(reply.status).toHaveBeenCalledWith(500)
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'error', message: 'Internal server error' }),
    )
  })
})
