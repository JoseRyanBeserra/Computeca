// src/pages/AdminUsersPage.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('../lib/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

import { api } from '../lib/api'
import { AdminUsersPage } from './AdminUsersPage'
import { renderWithProviders, setSession, makeUser } from '../test/utils'

const mockApi = vi.mocked(api)

function adminUser(overrides = {}) {
  return {
    id: 'u10',
    name: 'João Aluno',
    email: 'joao@gmail.com',
    role: 'COMMON' as const,
    canUpload: false,
    emailVerified: true,
    suspended: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  setSession(makeUser({ role: 'ADMIN', email: 'admin@dcx.ufpb.br' }))
})

describe('AdminUsersPage', () => {
  it('lista os usuários', async () => {
    mockApi.get.mockResolvedValue({ data: { users: [adminUser()], total: 1, page: 1, perPage: 10 } })
    renderWithProviders(<AdminUsersPage />)

    expect(await screen.findByText('João Aluno')).toBeInTheDocument()
    expect(screen.getByText('Gerenciar Usuários')).toBeInTheDocument()
    expect(screen.getByText(/1 usuário encontrado/i)).toBeInTheDocument()
  })

  it('filtra por aba de papel', async () => {
    mockApi.get.mockResolvedValue({ data: { users: [], total: 0, page: 1, perPage: 10 } })
    const user = userEvent.setup()
    renderWithProviders(<AdminUsersPage />)

    await screen.findByText(/Nenhum usuário encontrado/i)
    await user.click(screen.getByRole('button', { name: 'Professores' }))
    await waitFor(() =>
      expect(mockApi.get.mock.calls.some((c) => String(c[0]).includes('role=PROFESSOR'))).toBe(true),
    )
  })

  it('promove um usuário a professor com confirmação', async () => {
    mockApi.get.mockResolvedValue({ data: { users: [adminUser()], total: 1, page: 1, perPage: 10 } })
    mockApi.patch.mockResolvedValue({ data: adminUser({ role: 'PROFESSOR' }) })
    const user = userEvent.setup()
    renderWithProviders(<AdminUsersPage />)

    await user.click(await screen.findByRole('button', { name: /Promover para Professor/i }))
    await user.click(screen.getByRole('button', { name: /Sim/i }))

    await waitFor(() => expect(mockApi.patch).toHaveBeenCalledWith('/users/u10/set-professor'))
    expect(await screen.findByText('Promovido')).toBeInTheDocument()
  })
})
