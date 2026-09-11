// src/lib/apiError.test.ts
import { describe, it, expect } from 'vitest'
import { AxiosError, AxiosHeaders } from 'axios'
import { getApiErrorMessage, getApiErrorCode, getValidationIssues } from './apiError'

function makeAxiosError(status: number, data: unknown): AxiosError {
  const err = new AxiosError('request failed', 'ERR_BAD_RESPONSE')
  err.response = {
    status,
    statusText: '',
    data,
    headers: {},
    config: { headers: new AxiosHeaders() },
  }
  return err
}

describe('getApiErrorMessage', () => {
  it('retorna mensagem genérica para erro não-Axios', () => {
    expect(getApiErrorMessage(new Error('qualquer'))).toBe('Ocorreu um erro inesperado.')
  })

  it('retorna mensagem de conexão quando não há response (offline)', () => {
    const err = new AxiosError('network', 'ERR_NETWORK')
    expect(getApiErrorMessage(err)).toBe('Não foi possível conectar ao servidor. Verifique sua conexão.')
  })

  it('retorna fallback quando o corpo não tem message', () => {
    expect(getApiErrorMessage(makeAxiosError(500, {}))).toBe('Ocorreu um erro inesperado.')
  })

  it('prioriza a mensagem vinda do servidor', () => {
    const err = makeAxiosError(400, { status: 'error', message: 'Credenciais inválidas', code: 'X' })
    expect(getApiErrorMessage(err)).toBe('Credenciais inválidas')
  })
})

describe('getApiErrorCode', () => {
  it('retorna undefined para erro não-Axios', () => {
    expect(getApiErrorCode(new Error('x'))).toBeUndefined()
  })

  it('extrai o code estruturado', () => {
    const err = makeAxiosError(401, { status: 'error', message: 'm', code: 'INVALID_CREDENTIALS' })
    expect(getApiErrorCode(err)).toBe('INVALID_CREDENTIALS')
  })
})

describe('getValidationIssues', () => {
  it('retorna null para erro não-Axios', () => {
    expect(getValidationIssues(new Error('x'))).toBeNull()
  })

  it('retorna null quando o status não é 422', () => {
    expect(getValidationIssues(makeAxiosError(400, {}))).toBeNull()
  })

  it('retorna os issues quando status é 422', () => {
    const issues = { email: ['E-mail inválido'] }
    const err = makeAxiosError(422, { status: 'error', message: 'Validation error', issues })
    expect(getValidationIssues(err)).toEqual(issues)
  })

  it('retorna null quando 422 sem campo issues', () => {
    expect(getValidationIssues(makeAxiosError(422, { status: 'error', message: 'm' }))).toBeNull()
  })
})
