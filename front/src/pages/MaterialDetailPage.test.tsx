// src/pages/MaterialDetailPage.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('../lib/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

import { api } from '../lib/api'
import { MaterialDetailPage } from './MaterialDetailPage'
import { renderWithProviders, setSession, makeUser } from '../test/utils'

const mockApi = vi.mocked(api)

function material(overrides = {}) {
  const now = new Date().toISOString()
  return {
    id: 'm1',
    title: 'Guia de Geometria',
    originalFileName: 'geo.pdf',
    storageKey: 'k', mimeType: 'application/pdf', sizeBytes: 5000,
    status: 'APPROVED' as const,
    vectorStatus: 'DONE' as const,
    habilidadesBncc: ['EF03MA01'],
    uploadedById: 'u1',
    uploadedBy: { name: 'Prof. W', email: 'w@dcx.ufpb.br' },
    createdAt: now, updatedAt: now,
    ...overrides,
  }
}

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  setSession(makeUser({ role: 'PROFESSOR' }))
})

describe('MaterialDetailPage', () => {
  it('renderiza os detalhes do material', async () => {
    mockApi.get.mockResolvedValue({ data: material() })
    renderWithProviders(<MaterialDetailPage />, { route: '/materials/m1', path: '/materials/:id' })

    expect(await screen.findByText('Guia de Geometria')).toBeInTheDocument()
    expect(screen.getByText(/w@dcx.ufpb.br/)).toBeInTheDocument()
    expect(mockApi.get).toHaveBeenCalledWith('/mis/m1')
  })

  it('mostra o estado de erro', async () => {
    mockApi.get.mockRejectedValue(new Error('falha'))
    renderWithProviders(<MaterialDetailPage />, { route: '/materials/m1', path: '/materials/:id' })
    expect(await screen.findByText(/Não foi possível carregar o material/i)).toBeInTheDocument()
  })

  it('abre o PDF via URL pré-assinada de staff', async () => {
    mockApi.get.mockImplementation((url: string) => {
      if (url === '/mis/m1') return Promise.resolve({ data: material() })
      return Promise.resolve({ data: { url: 'https://minio/geo.pdf', expiresInSeconds: 60 } })
    })
    const openSpy = vi.fn()
    vi.stubGlobal('open', openSpy)
    const user = userEvent.setup()

    renderWithProviders(<MaterialDetailPage />, { route: '/materials/m1', path: '/materials/:id' })
    await user.click(await screen.findByRole('button', { name: /Abrir PDF/i }))

    await waitFor(() => expect(openSpy).toHaveBeenCalledWith('https://minio/geo.pdf', '_blank', 'noopener,noreferrer'))
    // staff usa a rota de review
    expect(mockApi.get).toHaveBeenCalledWith('/mis/m1/review-presigned-url')
    vi.unstubAllGlobals()
  })

  describe('recursos de IA conforme o vectorStatus', () => {
    it('material vetorizado (DONE): mostra o resumo e o botão de chat', async () => {
      mockApi.get.mockImplementation((url: string) => {
        if (url === '/mis/m1') return Promise.resolve({ data: material({ vectorStatus: 'DONE' }) })
        if (url === '/mis/m1/summary')
          return Promise.resolve({ data: { status: 'DONE', summary: 'Resumo gerado pela IA.', generatedAt: new Date().toISOString() } })
        return Promise.resolve({ data: {} })
      })

      renderWithProviders(<MaterialDetailPage />, { route: '/materials/m1', path: '/materials/:id' })

      expect(await screen.findByText('Resumo gerado pela IA.')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Conversar com IA/i })).toBeInTheDocument()
      expect(screen.queryByText(/em processamento/i)).not.toBeInTheDocument()
    })

    it('material em processamento (PROCESSING): avisa e desabilita o chat, sem chamar o resumo', async () => {
      mockApi.get.mockResolvedValue({ data: material({ vectorStatus: 'PROCESSING' }) })

      renderWithProviders(<MaterialDetailPage />, { route: '/materials/m1', path: '/materials/:id' })

      expect(await screen.findByText(/Material em processamento/i)).toBeInTheDocument()
      const chatBtn = screen.getByRole('button', { name: /Chat com IA indisponível/i })
      expect(chatBtn).toBeDisabled()
      expect(screen.queryByRole('button', { name: /Conversar com IA/i })).not.toBeInTheDocument()
      // não deve tentar gerar/buscar o resumo enquanto não vetorizado
      expect(mockApi.get).not.toHaveBeenCalledWith('/mis/m1/summary')
    })

    it('material com falha de processamento (FAILED): avisa indisponibilidade dos recursos de IA', async () => {
      mockApi.get.mockResolvedValue({ data: material({ vectorStatus: 'FAILED' }) })

      renderWithProviders(<MaterialDetailPage />, { route: '/materials/m1', path: '/materials/:id' })

      expect(await screen.findByText(/Recursos de IA indisponíveis/i)).toBeInTheDocument()
      expect(mockApi.get).not.toHaveBeenCalledWith('/mis/m1/summary')
    })
  })
})
