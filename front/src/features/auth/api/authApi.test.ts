// src/features/auth/api/authApi.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../../lib/api', () => ({
  api: { post: vi.fn() },
}))

import { api } from '../../../lib/api'
import { loginRequest, logoutRequest, verifyEmailRequest } from './authApi'

const mockApi = vi.mocked(api)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('authApi', () => {
  it('loginRequest faz POST /auth/login e retorna os dados', async () => {
    mockApi.post.mockResolvedValue({ data: { accessToken: 't', user: { id: 'u1' } } })
    const res = await loginRequest({ email: 'a@b.com', password: 'x' })
    expect(mockApi.post).toHaveBeenCalledWith('/auth/login', { email: 'a@b.com', password: 'x' })
    expect(res.accessToken).toBe('t')
  })

  it('logoutRequest faz POST /auth/logout', async () => {
    mockApi.post.mockResolvedValue({ data: undefined })
    await logoutRequest()
    expect(mockApi.post).toHaveBeenCalledWith('/auth/logout')
  })

  it('verifyEmailRequest faz POST /auth/verify-email com o código', async () => {
    mockApi.post.mockResolvedValue({ data: { message: 'ok' } })
    const res = await verifyEmailRequest('123456')
    expect(mockApi.post).toHaveBeenCalledWith('/auth/verify-email', { code: '123456' })
    expect(res.message).toBe('ok')
  })
})
