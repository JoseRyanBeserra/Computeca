// src/lib/api.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import axios, { AxiosError, AxiosHeaders } from 'axios'
import { api } from './api'

// Acesso direto aos handlers registrados pelos interceptors, para exercitá-los
// isoladamente sem disparar requisições HTTP reais.
/* eslint-disable @typescript-eslint/no-explicit-any */
const requestFulfilled = (api.interceptors.request as any).handlers[0].fulfilled
const responseFulfilled = (api.interceptors.response as any).handlers[0].fulfilled
const responseRejected = (api.interceptors.response as any).handlers[0].rejected

function makeAuthError(status: number): AxiosError {
  const err = new AxiosError('request failed', 'ERR_BAD_RESPONSE')
  err.config = { headers: new AxiosHeaders() } as never
  err.response = {
    status,
    statusText: '',
    data: {},
    headers: {},
    config: { headers: new AxiosHeaders() } as never,
  }
  return err
}

describe('api — interceptor de request', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('injeta o Authorization quando há accessToken', () => {
    localStorage.setItem('accessToken', 'abc123')
    const config = requestFulfilled({ headers: {} })
    expect(config.headers.Authorization).toBe('Bearer abc123')
  })

  it('não injeta Authorization quando não há token', () => {
    const config = requestFulfilled({ headers: {} })
    expect(config.headers.Authorization).toBeUndefined()
  })
})

describe('api — interceptor de response', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('repassa respostas de sucesso sem alteração', () => {
    const response = { status: 200, data: { ok: true } }
    expect(responseFulfilled(response)).toBe(response)
  })

  it('rejeita erros que não são do Axios', async () => {
    const err = new Error('erro genérico')
    await expect(responseRejected(err)).rejects.toThrow('erro genérico')
  })

  it('em 401 sem token (usuário anônimo) apenas propaga o erro, sem refresh', async () => {
    const refreshSpy = vi.spyOn(axios, 'post')
    const err = makeAuthError(401)
    await expect(responseRejected(err)).rejects.toBe(err)
    expect(refreshSpy).not.toHaveBeenCalled()
  })

  it('propaga o erro em status diferente de 401', async () => {
    const err = makeAuthError(500)
    await expect(responseRejected(err)).rejects.toBe(err)
  })

  it('em 401 com token, tenta refresh; ao falhar, limpa a sessão e redireciona para /login', async () => {
    localStorage.setItem('accessToken', 'expirado')
    const refreshSpy = vi.spyOn(axios, 'post').mockRejectedValue(new Error('refresh failed'))

    const originalLocation = window.location
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { href: '' },
    })

    try {
      const err = makeAuthError(401)
      await expect(responseRejected(err)).rejects.toBeDefined()
      expect(refreshSpy).toHaveBeenCalledTimes(1)
      expect(localStorage.getItem('accessToken')).toBeNull()
      expect(window.location.href).toBe('/login')
    } finally {
      Object.defineProperty(window, 'location', { configurable: true, value: originalLocation })
    }
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})
