// src/pages/CreateOrganizationPage.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('../lib/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

import { api } from '../lib/api'
import { CreateOrganizationPage } from './CreateOrganizationPage'
import { renderWithProviders, setSession, makeUser } from '../test/utils'

const mockApi = vi.mocked(api)

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  setSession(makeUser({ role: 'PROFESSOR' }))
})

describe('CreateOrganizationPage', () => {
  it('renderiza o formulário de novo projeto', () => {
    renderWithProviders(<CreateOrganizationPage />)
    expect(screen.getByText('Novo Projeto')).toBeInTheDocument()
    expect(screen.getByLabelText(/Nome/i)).toBeInTheDocument()
  })

  it('valida nome com menos de 2 caracteres', async () => {
    const user = userEvent.setup()
    renderWithProviders(<CreateOrganizationPage />)
    await user.type(screen.getByLabelText(/^Nome/i), 'A')
    expect(screen.getByText(/Mínimo de 2 caracteres/i)).toBeInTheDocument()
  })

  it('cria o projeto e mostra o estado de sucesso', async () => {
    mockApi.post.mockResolvedValue({
      data: { id: 'o9', name: 'Cálculo I', description: null, status: 'ACTIVE', createdById: 'u1', createdAt: '', updatedAt: '' },
    })
    const user = userEvent.setup()
    renderWithProviders(<CreateOrganizationPage />)

    await user.type(screen.getByLabelText(/^Nome/i), 'Cálculo I')
    await user.click(screen.getByRole('button', { name: /Criar projeto/i }))

    await waitFor(() =>
      expect(mockApi.post).toHaveBeenCalledWith('/organizations', { name: 'Cálculo I', description: undefined }),
    )
    expect(await screen.findByText(/Projeto criado!/i)).toBeInTheDocument()
  })

  it('permite criar outro projeto após o sucesso', async () => {
    mockApi.post.mockResolvedValue({
      data: { id: 'o9', name: 'Cálculo I', description: null, status: 'ACTIVE', createdById: 'u1', createdAt: '', updatedAt: '' },
    })
    const user = userEvent.setup()
    renderWithProviders(<CreateOrganizationPage />)

    await user.type(screen.getByLabelText(/^Nome/i), 'Cálculo I')
    await user.click(screen.getByRole('button', { name: /Criar projeto/i }))
    await screen.findByText(/Projeto criado!/i)

    await user.click(screen.getByRole('button', { name: /Criar outra/i }))
    // Volta ao formulário
    expect(screen.getByText('Novo Projeto')).toBeInTheDocument()
    expect(screen.getByLabelText(/^Nome/i)).toHaveValue('')
  })

  it('mostra erro da API ao falhar', async () => {
    mockApi.post.mockRejectedValue(new Error('falha'))
    const user = userEvent.setup()
    renderWithProviders(<CreateOrganizationPage />)

    await user.type(screen.getByLabelText(/^Nome/i), 'Projeto X')
    await user.click(screen.getByRole('button', { name: /Criar projeto/i }))
    expect(await screen.findByText(/Ocorreu um erro inesperado/i)).toBeInTheDocument()
  })
})
