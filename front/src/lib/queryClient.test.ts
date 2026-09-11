// src/lib/queryClient.test.ts
import { describe, it, expect } from 'vitest'
import { queryClient } from './queryClient'

type RetryFn = (failureCount: number, error: unknown) => boolean

function getQueryRetry(): RetryFn {
  return queryClient.getDefaultOptions().queries?.retry as RetryFn
}

describe('queryClient — política de retry', () => {
  it('não retenta em 401, 403 e 422', () => {
    const retry = getQueryRetry()
    for (const status of [401, 403, 422]) {
      expect(retry(0, { response: { status } })).toBe(false)
    }
  })

  it('retenta em erros 5xx enquanto failureCount < 2', () => {
    const retry = getQueryRetry()
    expect(retry(0, { response: { status: 500 } })).toBe(true)
    expect(retry(1, { response: { status: 500 } })).toBe(true)
    expect(retry(2, { response: { status: 500 } })).toBe(false)
  })

  it('retenta em erros sem response (ex.: rede) até o limite', () => {
    const retry = getQueryRetry()
    expect(retry(0, new Error('network'))).toBe(true)
    expect(retry(2, new Error('network'))).toBe(false)
  })

  it('mutations não retentam', () => {
    expect(queryClient.getDefaultOptions().mutations?.retry).toBe(false)
  })
})
