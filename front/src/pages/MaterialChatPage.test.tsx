// src/pages/MaterialChatPage.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import { ThemeProvider } from '../context/ThemeContext'

vi.mock('../lib/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

import { api } from '../lib/api'
import { MaterialChatPage } from './MaterialChatPage'
import { setSession } from '../test/utils'

const mockApi = vi.mocked(api)

const material = {
  id: 'm1',
  title: 'Documento sobre Frações',
  uploadedBy: { name: 'Prof. K' },
  sizeBytes: 2048,
  createdAt: new Date().toISOString(),
}

function renderChat() {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <MemoryRouter initialEntries={[{ pathname: '/materials/m1/chat', state: { material } }]}>
            <Routes>
              <Route path="/materials/:materialId/chat" element={<MaterialChatPage />} />
            </Routes>
          </MemoryRouter>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  setSession()
})

describe('MaterialChatPage', () => {
  it('mostra o título do material e as sugestões iniciais', () => {
    renderChat()
    expect(screen.getAllByText('Documento sobre Frações').length).toBeGreaterThan(0)
    expect(screen.getByText(/Faça um resumo deste documento/i)).toBeInTheDocument()
  })

  it('envia uma pergunta e mostra a resposta da IA', async () => {
    mockApi.post.mockResolvedValue({ data: { answer: 'As frações representam partes.', chunksUsed: 3 } })
    const user = userEvent.setup()
    renderChat()

    await user.type(screen.getByPlaceholderText(/Faça uma pergunta/i), 'O que são frações?')
    await user.click(screen.getByRole('button', { name: 'Enviar' }))

    expect(await screen.findByText('As frações representam partes.')).toBeInTheDocument()
    expect(mockApi.post).toHaveBeenCalledWith('/mis/m1/chat', { question: 'O que são frações?' })
  })

  it('usa uma sugestão como pergunta', async () => {
    mockApi.post.mockResolvedValue({ data: { answer: 'Resumo pronto.', chunksUsed: 1 } })
    const user = userEvent.setup()
    renderChat()

    await user.click(screen.getByText(/Faça um resumo deste documento/i))
    await waitFor(() =>
      expect(mockApi.post).toHaveBeenCalledWith('/mis/m1/chat', { question: 'Faça um resumo deste documento' }),
    )
  })

  it('abre o PDF do material', async () => {
    mockApi.get.mockResolvedValue({ data: { url: 'https://minio/f.pdf', expiresInSeconds: 60 } })
    const openSpy = vi.fn()
    vi.stubGlobal('open', openSpy)
    const user = userEvent.setup()
    renderChat()

    await user.click(screen.getByRole('button', { name: /Abrir PDF/i }))
    await waitFor(() => expect(openSpy).toHaveBeenCalledWith('https://minio/f.pdf', '_blank', 'noopener,noreferrer'))
    expect(mockApi.get).toHaveBeenCalledWith('/mis/m1/public-presigned-url')
    vi.unstubAllGlobals()
  })

  it('mostra mensagem de erro quando a IA falha', async () => {
    mockApi.post.mockRejectedValue(new Error('ia down'))
    const user = userEvent.setup()
    renderChat()

    await user.type(screen.getByPlaceholderText(/Faça uma pergunta/i), 'Pergunta')
    await user.click(screen.getByRole('button', { name: 'Enviar' }))

    expect(await screen.findByText(/Erro ao consultar a IA/i)).toBeInTheDocument()
  })
})
