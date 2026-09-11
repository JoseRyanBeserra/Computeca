// src/pages/RegisterPage.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('../lib/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))

import { api } from '../lib/api'
import { RegisterPage } from './RegisterPage'
import { renderWithProviders } from '../test/utils'

const mockApi = vi.mocked(api)

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Nome completo'), 'Maria Silva')
  await user.type(screen.getByLabelText('E-mail'), 'maria@gmail.com')
  await user.type(screen.getByLabelText('Senha'), 'senha12345')
  await user.type(screen.getByLabelText('Confirmar senha'), 'senha12345')
}

describe('RegisterPage', () => {
  it('renderiza o formulário de cadastro', () => {
    renderWithProviders(<RegisterPage />, { route: '/register' })
    expect(screen.getByRole('heading', { name: 'Criar conta' })).toBeInTheDocument()
    expect(screen.getByLabelText('Nome completo')).toBeInTheDocument()
  })

  it('mostra erros de validação ao submeter vazio', async () => {
    const user = userEvent.setup()
    renderWithProviders(<RegisterPage />, { route: '/register' })
    await user.click(screen.getByRole('button', { name: /Criar conta/i }))
    expect(screen.getByText(/O nome deve ter pelo menos 2 caracteres/i)).toBeInTheDocument()
    expect(screen.getByText(/Informe um e-mail válido/i)).toBeInTheDocument()
    expect(mockApi.post).not.toHaveBeenCalled()
  })

  it('valida senhas divergentes', async () => {
    const user = userEvent.setup()
    renderWithProviders(<RegisterPage />, { route: '/register' })
    await user.type(screen.getByLabelText('Senha'), 'senha12345')
    await user.type(screen.getByLabelText('Confirmar senha'), 'outrasenha')
    await user.click(screen.getByRole('button', { name: /Criar conta/i }))
    expect(screen.getByText(/As senhas não coincidem/i)).toBeInTheDocument()
  })

  it('detecta e-mail institucional', async () => {
    const user = userEvent.setup()
    renderWithProviders(<RegisterPage />, { route: '/register' })
    await user.type(screen.getByLabelText('E-mail'), 'joao@dcx.ufpb.br')
    expect(screen.getByText(/E-mail institucional detectado/i)).toBeInTheDocument()
  })

  it('submete o cadastro válido', async () => {
    mockApi.post.mockResolvedValue({ data: { id: 'u1', name: 'Maria Silva', email: 'maria@gmail.com' } })
    const user = userEvent.setup()
    renderWithProviders(<RegisterPage />, { route: '/register' })

    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: /Criar conta/i }))

    await waitFor(() =>
      expect(mockApi.post).toHaveBeenCalledWith('/users', {
        name: 'Maria Silva',
        email: 'maria@gmail.com',
        password: 'senha12345',
      }),
    )
  })
})
