// src/pages/VerifyEmailSentPage.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from '../context/ThemeContext'

vi.mock('../lib/api', () => ({
  api: { post: vi.fn() },
}))

import { api } from '../lib/api'
import { VerifyEmailSentPage } from './VerifyEmailSentPage'

const mockApi = vi.mocked(api)

function renderAt(state: unknown) {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <MemoryRouter initialEntries={[{ pathname: '/verify-email-sent', state }]}>
          <Routes>
            <Route path="/verify-email-sent" element={<VerifyEmailSentPage />} />
            <Route path="/register" element={<p>Página de cadastro</p>} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

describe('VerifyEmailSentPage', () => {
  it('redireciona para /register quando não há e-mail no state', () => {
    renderAt(null)
    expect(screen.getByText('Página de cadastro')).toBeInTheDocument()
  })

  it('mostra o e-mail e confirma o código de 6 dígitos', async () => {
    mockApi.post.mockResolvedValue({ data: { message: 'ok' } })
    const user = userEvent.setup()
    renderAt({ email: 'novo@dcx.ufpb.br' })

    expect(screen.getByText(/Verifique seu e-mail/i)).toBeInTheDocument()
    expect(screen.getByText('novo@dcx.ufpb.br')).toBeInTheDocument()

    await user.type(screen.getByLabelText(/Código de verificação/i), '123456')
    await user.click(screen.getByRole('button', { name: /Confirmar código/i }))

    await waitFor(() => expect(mockApi.post).toHaveBeenCalledWith('/auth/verify-email', { code: '123456' }))
    expect(await screen.findByText(/E-mail verificado!/i)).toBeInTheDocument()
  })

  it('ignora caracteres não numéricos e limita a 6 dígitos', async () => {
    const user = userEvent.setup()
    renderAt({ email: 'a@dcx.ufpb.br' })
    const input = screen.getByLabelText(/Código de verificação/i) as HTMLInputElement
    await user.type(input, 'ab12cd3456789')
    expect(input.value).toBe('123456')
  })
})
