// src/pages/OrganizationsListPage.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('../lib/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

import { api } from '../lib/api'
import { OrganizationsListPage } from './OrganizationsListPage'
import { renderWithProviders, setSession, makeUser } from '../test/utils'

const mockApi = vi.mocked(api)

const org = {
  id: 'o1',
  name: 'Projeto Alpha',
  description: 'Descrição do projeto',
  status: 'ACTIVE' as const,
  myRole: 'ADMIN' as const,
  memberCount: 3,
  createdAt: new Date().toISOString(),
}

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

describe('OrganizationsListPage', () => {
  it('lista os projetos do usuário', async () => {
    mockApi.get.mockResolvedValue({ data: [org] })
    setSession(makeUser({ role: 'PROFESSOR' }))

    renderWithProviders(<OrganizationsListPage />)

    expect(await screen.findByText('Projeto Alpha')).toBeInTheDocument()
    expect(screen.getByText(/3 membro/i)).toBeInTheDocument()
    expect(mockApi.get).toHaveBeenCalledWith('/organizations/mine')
  })

  it('mostra o botão "Nova" para PROFESSOR/ADMIN', async () => {
    mockApi.get.mockResolvedValue({ data: [] })
    setSession(makeUser({ role: 'PROFESSOR' }))

    renderWithProviders(<OrganizationsListPage />)

    expect(await screen.findByText(/Você ainda não faz parte/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Nova/i })).toBeInTheDocument()
  })

  it('exibe selo de arquivado e permite abrir o projeto', async () => {
    mockApi.get.mockResolvedValue({
      data: [{ ...org, status: 'ARCHIVED', myRole: 'MEMBER' }],
    })
    setSession(makeUser({ role: 'PROFESSOR' }))
    const user = userEvent.setup()
    renderWithProviders(<OrganizationsListPage />)

    expect(await screen.findByText('Arquivado')).toBeInTheDocument()
    // clicar no card não deve quebrar (navegação interna)
    await user.click(screen.getByText('Projeto Alpha'))
  })
})
