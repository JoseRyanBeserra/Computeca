// src/test/utils.tsx
// Helpers de teste: render com todos os providers reais (Query, Auth, Theme, Router).
// Mockando apenas a camada `lib/api`, os testes de página exercitam também os
// hooks e os módulos de API — maximizando a cobertura por teste.
import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import { ThemeProvider } from '../context/ThemeContext'
import type { AuthUser, Role } from '../types/auth'

export function makeUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: 'u1',
    name: 'Ana Souza',
    email: 'ana@dcx.ufpb.br',
    role: 'PROFESSOR' as Role,
    canUpload: true,
    ...overrides,
  }
}

/** Persiste uma sessão no localStorage ANTES do render (AuthProvider lê na init). */
export function setSession(user: AuthUser = makeUser(), token = 'test-token'): void {
  localStorage.setItem('accessToken', token)
  localStorage.setItem('authUser', JSON.stringify(user))
}

interface RenderOptions {
  /** Entrada inicial do MemoryRouter (ex.: '/organizations/o1') */
  route?: string
  /** Quando informado, monta o ui dentro de <Routes><Route path>. Útil para useParams. */
  path?: string
}

export function renderWithProviders(ui: ReactElement, { route = '/', path }: RenderOptions = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  const tree = path ? (
    <Routes>
      <Route path={path} element={ui} />
    </Routes>
  ) : (
    ui
  )

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <MemoryRouter initialEntries={[route]}>{tree}</MemoryRouter>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>,
  )
}
