// src/pages/PublicMaterialsPage.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('../lib/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

import { api } from '../lib/api'
import { PublicMaterialsPage } from './PublicMaterialsPage'
import { renderWithProviders, setSession, makeUser } from '../test/utils'

const mockApi = vi.mocked(api)

function material(id: string, title: string) {
  const now = new Date().toISOString()
  return {
    id, title,
    originalFileName: `${id}.pdf`,
    storageKey: 'k', mimeType: 'application/pdf', sizeBytes: 4096,
    status: 'APPROVED' as const,
    habilidadesBncc: [],
    uploadedById: 'u1',
    uploadedBy: { name: 'Prof. Z', email: 'z@dcx.ufpb.br' },
    createdAt: now, updatedAt: now,
  }
}

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  setSession(makeUser({ name: 'Carlos Lima', role: 'COMMON', email: 'carlos@gmail.com' }))
})

describe('PublicMaterialsPage', () => {
  it('exibe o acervo e o nome do usuário na topbar', async () => {
    mockApi.get.mockResolvedValue({ data: { materials: [material('m1', 'Livro X')], total: 1, page: 1, perPage: 25 } })
    renderWithProviders(<PublicMaterialsPage />)

    expect(await screen.findByText('Livro X')).toBeInTheDocument()
    expect(screen.getByText('Carlos Lima')).toBeInTheDocument()
    expect(screen.getByText('Acervo de Materiais')).toBeInTheDocument()
    expect(mockApi.get.mock.calls[0][0]).toContain('/mis/public')
  })

  it('mostra o estado vazio', async () => {
    mockApi.get.mockResolvedValue({ data: { materials: [], total: 0, page: 1, perPage: 25 } })
    renderWithProviders(<PublicMaterialsPage />)
    expect(await screen.findByText('Nenhum material disponível')).toBeInTheDocument()
  })

  it('abre o PDF público de um material', async () => {
    mockApi.get.mockImplementation((url: string) => {
      if (url.includes('/mis/public')) return Promise.resolve({ data: { materials: [material('m1', 'Livro X')], total: 1, page: 1, perPage: 25 } })
      return Promise.resolve({ data: { url: 'https://minio/x.pdf', expiresInSeconds: 60 } })
    })
    const openSpy = vi.fn()
    vi.stubGlobal('open', openSpy)
    const user = userEvent.setup()
    renderWithProviders(<PublicMaterialsPage />)

    await user.click(await screen.findByRole('button', { name: /Visualizar Livro X/i }))
    await waitFor(() => expect(openSpy).toHaveBeenCalledWith('https://minio/x.pdf', '_blank', 'noopener,noreferrer'))
    expect(mockApi.get).toHaveBeenCalledWith('/mis/m1/public-presigned-url')
    vi.unstubAllGlobals()
  })

  it('mostra o estado de erro', async () => {
    mockApi.get.mockRejectedValue(new Error('falha'))
    renderWithProviders(<PublicMaterialsPage />)
    expect(await screen.findByText(/Não foi possível carregar os materiais/i)).toBeInTheDocument()
  })

  it('faz logout ao clicar em Sair', async () => {
    mockApi.get.mockResolvedValue({ data: { materials: [], total: 0, page: 1, perPage: 25 } })
    const user = userEvent.setup()
    renderWithProviders(<PublicMaterialsPage />)

    await screen.findByText('Acervo de Materiais')
    await user.click(screen.getByRole('button', { name: /Sair/i }))
    expect(localStorage.getItem('accessToken')).toBeNull()
  })
})
