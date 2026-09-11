// src/pages/LoginPage.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('../lib/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))

import { api } from '../lib/api'
import { LoginPage } from './LoginPage'
import { renderWithProviders } from '../test/utils'

const mockApi = vi.mocked(api)

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

describe('LoginPage', () => {
  it('renderiza o formulário de login', () => {
    renderWithProviders(<LoginPage />, { route: '/login' })
    expect(screen.getByText(/Bem-vindo de volta/i)).toBeInTheDocument()
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument()
    expect(screen.getByLabelText('Senha')).toBeInTheDocument()
  })

  it('submete as credenciais (e-mail com trim)', async () => {
    mockApi.post.mockResolvedValue({
      data: { accessToken: 'tok', user: { id: 'u1', name: 'Ana', email: 'ana@dcx.ufpb.br', role: 'PROFESSOR', canUpload: true } },
    })
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />, { route: '/login' })

    await user.type(screen.getByLabelText('E-mail'), '  ana@dcx.ufpb.br  ')
    await user.type(screen.getByLabelText('Senha'), 'senha12345')
    await user.click(screen.getByRole('button', { name: /^Entrar$/i }))

    await waitFor(() =>
      expect(mockApi.post).toHaveBeenCalledWith('/auth/login', { email: 'ana@dcx.ufpb.br', password: 'senha12345' }),
    )
  })

  it('alterna a visibilidade da senha', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />, { route: '/login' })
    const password = screen.getByLabelText('Senha') as HTMLInputElement
    expect(password.type).toBe('password')
    await user.click(screen.getByRole('button', { name: /Mostrar senha/i }))
    expect(password.type).toBe('text')
  })

  it('exibe alerta de erro quando o login falha', async () => {
    mockApi.post.mockRejectedValue(new Error('falhou'))
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />, { route: '/login' })

    await user.type(screen.getByLabelText('E-mail'), 'x@y.com')
    await user.type(screen.getByLabelText('Senha'), 'senha12345')
    await user.click(screen.getByRole('button', { name: /^Entrar$/i }))

    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })
})
