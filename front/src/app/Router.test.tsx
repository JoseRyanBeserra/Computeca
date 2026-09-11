// src/app/Router.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '../context/AuthContext'
import { ThemeProvider } from '../context/ThemeContext'

vi.mock('../lib/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

import { api } from '../lib/api'
import { Router } from './Router'
import { makeUser } from '../test/utils'

const mockApi = vi.mocked(api)

function renderAt(path: string) {
  window.history.pushState({}, '', path)
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>{children}</ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
  return render(<Router />, { wrapper })
}

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  mockApi.get.mockResolvedValue({ data: { materials: [], total: 0, page: 1, perPage: 25 } })
})

describe('Router (guards)', () => {
  it('rota privada redireciona anônimo para /login', async () => {
    renderAt('/materials')
    expect(await screen.findByText(/Bem-vindo de volta/i)).toBeInTheDocument()
  })

  it('rota pública redireciona autenticado para a Home', async () => {
    localStorage.setItem('accessToken', 't')
    localStorage.setItem('authUser', JSON.stringify(makeUser({ role: 'PROFESSOR' })))
    renderAt('/login')
    expect(await screen.findByText('Recursos disponíveis')).toBeInTheDocument()
  })

  it('rota de admin redireciona não-admin para a Home', async () => {
    localStorage.setItem('accessToken', 't')
    localStorage.setItem('authUser', JSON.stringify(makeUser({ role: 'PROFESSOR' })))
    renderAt('/admin/users')
    expect(await screen.findByText('Recursos disponíveis')).toBeInTheDocument()
  })

  it('rota de admin é acessível para ADMIN', async () => {
    localStorage.setItem('accessToken', 't')
    localStorage.setItem('authUser', JSON.stringify(makeUser({ role: 'ADMIN', email: 'admin@dcx.ufpb.br' })))
    mockApi.get.mockResolvedValue({ data: { users: [], total: 0, page: 1, perPage: 10 } })
    renderAt('/admin/users')
    expect(await screen.findByText('Gerenciar Usuários')).toBeInTheDocument()
  })

  it('caminho desconhecido renderiza a página 404', () => {
    renderAt('/rota-inexistente')
    expect(screen.getByText('404')).toBeInTheDocument()
  })

  it('rota de professor redireciona usuário comum para a Home', async () => {
    localStorage.setItem('accessToken', 't')
    localStorage.setItem('authUser', JSON.stringify(makeUser({ role: 'COMMON', email: 'comum@gmail.com', canUpload: false })))
    renderAt('/organizations/create')
    expect(await screen.findByText('Recursos disponíveis')).toBeInTheDocument()
  })

  it('rota de professor é acessível para PROFESSOR', async () => {
    localStorage.setItem('accessToken', 't')
    localStorage.setItem('authUser', JSON.stringify(makeUser({ role: 'PROFESSOR' })))
    mockApi.get.mockResolvedValue({ data: [] })
    renderAt('/organizations/create')
    expect(await screen.findByText('Novo Projeto')).toBeInTheDocument()
  })

  it('rota de upload redireciona anônimo para /login', async () => {
    renderAt('/upload')
    expect(await screen.findByText(/Bem-vindo de volta/i)).toBeInTheDocument()
  })

  it('rota de upload é acessível para usuário institucional', async () => {
    localStorage.setItem('accessToken', 't')
    localStorage.setItem('authUser', JSON.stringify(makeUser({ role: 'PROFESSOR' })))
    mockApi.get.mockResolvedValue({ data: [] })
    renderAt('/upload')
    expect(await screen.findByText('Upload de Material')).toBeInTheDocument()
  })
})
