// __tests__/unit/utils/validateUUID.test.ts
import { describe, it, expect } from 'vitest'
import { validateUserId } from '../../../src/utils/validateUUID'
import { GeneralErrorResponse } from '../../../src/errors/GeneralErrorResponse'

describe('validateUserId', () => {
  it('não lança para um UUID v4 válido', () => {
    expect(() => validateUserId('3f2504e0-4f89-41d3-9a0c-0305e82c3301')).not.toThrow()
  })

  it('lança 400 (MISSING_ID) quando o id é null', () => {
    try {
      validateUserId(null)
      expect.unreachable('deveria ter lançado')
    } catch (error) {
      expect(error).toBeInstanceOf(GeneralErrorResponse)
      expect((error as GeneralErrorResponse).statusCode).toBe(400)
      expect((error as GeneralErrorResponse).code).toBe('MISSING_ID')
    }
  })

  it('lança 400 (MISSING_ID) quando o id é undefined', () => {
    try {
      validateUserId(undefined)
      expect.unreachable('deveria ter lançado')
    } catch (error) {
      expect((error as GeneralErrorResponse).statusCode).toBe(400)
      expect((error as GeneralErrorResponse).code).toBe('MISSING_ID')
    }
  })

  it('lança 400 (INVALID_ID_FORMAT) quando o id não é um UUID v4', () => {
    try {
      validateUserId('not-a-uuid')
      expect.unreachable('deveria ter lançado')
    } catch (error) {
      expect((error as GeneralErrorResponse).statusCode).toBe(400)
      expect((error as GeneralErrorResponse).code).toBe('INVALID_ID_FORMAT')
    }
  })

  it('lança INVALID_ID_FORMAT para UUID de versão diferente de 4', () => {
    // UUID v1 (terceiro grupo começa com "1", não "4")
    expect(() => validateUserId('3f2504e0-4f89-11d3-9a0c-0305e82c3301')).toThrow(GeneralErrorResponse)
  })
})
