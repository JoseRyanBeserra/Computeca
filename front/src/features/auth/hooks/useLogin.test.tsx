// src/features/auth/hooks/useLogin.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../../../context/AuthContext'

// Mocks das dependências externas do hook
const navigateMock = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => navigateMock }
})

vi.mock('../api/authApi', () => ({
  loginRequest: vi.fn(),
}))

import { useLogin } from './useLogin'
import { loginRequest } from '../api/authApi'

const mockLogin = vi.mocked(loginRequest)

function makeWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter>{children}</MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

describe('useLogin', () => {
  beforeEach(() => {
    localStorage.clear()
    navigateMock.mockReset()
    mockLogin.mockReset()
  })

  it('ao logar com sucesso, persiste a sessão e navega para "/"', async () => {
    mockLogin.mockResolvedValue({
      accessToken: 'tok',
      user: { id: 'u1', name: 'Ana', email: 'ana@dcx.ufpb.br', role: 'PROFESSOR', canUpload: true },
    })

    const { result } = renderHook(() => useLogin(), { wrapper: makeWrapper() })

    result.current.mutate({ email: 'ana@dcx.ufpb.br', password: '12345678' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockLogin).toHaveBeenCalledWith({ email: 'ana@dcx.ufpb.br', password: '12345678' })
    expect(localStorage.getItem('accessToken')).toBe('tok')
    expect(navigateMock).toHaveBeenCalledWith('/', { replace: true })
  })

  it('propaga o erro quando o login falha', async () => {
    mockLogin.mockRejectedValue(new Error('401'))

    const { result } = renderHook(() => useLogin(), { wrapper: makeWrapper() })
    result.current.mutate({ email: 'x@y.com', password: 'bad' })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(navigateMock).not.toHaveBeenCalled()
    expect(localStorage.getItem('accessToken')).toBeNull()
  })
})
