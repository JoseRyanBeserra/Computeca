// src/features/users/api/usersApi.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../../lib/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}))

import { api } from '../../../lib/api'
import { registerRequest, listUsersRequest, setUserAsProfessorRequest } from './usersApi'

const mockApi = vi.mocked(api)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('usersApi', () => {
  it('registerRequest faz POST /users', async () => {
    mockApi.post.mockResolvedValue({ data: { id: 'u1' } })
    await registerRequest({ name: 'Ana', email: 'a@b.com', password: '12345678' })
    expect(mockApi.post).toHaveBeenCalledWith('/users', { name: 'Ana', email: 'a@b.com', password: '12345678' })
  })

  it('listUsersRequest sem parâmetros chama /users?', async () => {
    mockApi.get.mockResolvedValue({ data: { users: [], total: 0, page: 1, perPage: 10 } })
    await listUsersRequest()
    expect(mockApi.get).toHaveBeenCalledWith('/users?')
  })

  it('listUsersRequest monta a query com role, page e perPage', async () => {
    mockApi.get.mockResolvedValue({ data: { users: [], total: 0, page: 1, perPage: 10 } })
    await listUsersRequest({ role: 'PROFESSOR', page: 2, perPage: 20 })
    const url = mockApi.get.mock.calls[0][0] as string
    expect(url).toContain('role=PROFESSOR')
    expect(url).toContain('page=2')
    expect(url).toContain('perPage=20')
  })

  it('setUserAsProfessorRequest faz PATCH /users/:id/set-professor', async () => {
    mockApi.patch.mockResolvedValue({ data: { id: 'u1' } })
    await setUserAsProfessorRequest('u1')
    expect(mockApi.patch).toHaveBeenCalledWith('/users/u1/set-professor')
  })
})
