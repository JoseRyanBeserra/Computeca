// src/pages/InvitesPage.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('../lib/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

import { api } from '../lib/api'
import { InvitesPage } from './InvitesPage'
import { renderWithProviders, setSession } from '../test/utils'

const mockApi = vi.mocked(api)

function invite(overrides = {}) {
  return {
    id: 'i1',
    organizationId: 'o1',
    invitedUserId: 'u1',
    invitedById: 'u2',
    status: 'PENDING' as const,
    createdAt: new Date().toISOString(),
    respondedAt: null,
    organization: { name: 'Projeto Beta' },
    invitedBy: { name: 'Prof. Carlos' },
    ...overrides,
  }
}

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  setSession()
})

describe('InvitesPage', () => {
  it('mostra o estado vazio quando não há convites', async () => {
    mockApi.get.mockResolvedValue({ data: [] })
    renderWithProviders(<InvitesPage />)
    expect(await screen.findByText(/Você não tem nenhum convite/i)).toBeInTheDocument()
  })

  it('lista convites pendentes e responde ACCEPT', async () => {
    mockApi.get.mockResolvedValue({ data: [invite()] })
    mockApi.patch.mockResolvedValue({ data: undefined })

    const user = userEvent.setup()
    renderWithProviders(<InvitesPage />)

    expect(await screen.findByText('Projeto Beta')).toBeInTheDocument()
    expect(screen.getByText(/Prof. Carlos/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Aceitar/i }))
    await waitFor(() =>
      expect(mockApi.patch).toHaveBeenCalledWith('/organizations/invites/i1/respond', { action: 'ACCEPT' }),
    )
  })

  it('exibe convites resolvidos no histórico', async () => {
    mockApi.get.mockResolvedValue({ data: [invite({ id: 'i2', status: 'ACCEPTED' })] })
    renderWithProviders(<InvitesPage />)
    expect(await screen.findByText('Histórico')).toBeInTheDocument()
    expect(screen.getByText('Aceito')).toBeInTheDocument()
  })
})
