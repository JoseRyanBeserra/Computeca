// src/pages/MaterialsPage.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('../lib/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

import { api } from '../lib/api'
import { MaterialsPage } from './MaterialsPage'
import { renderWithProviders, setSession } from '../test/utils'

const mockApi = vi.mocked(api)

function material(overrides = {}) {
  const now = new Date().toISOString()
  return {
    id: 'm1',
    title: 'Apostila de Álgebra',
    originalFileName: 'algebra.pdf',
    storageKey: 'k',
    mimeType: 'application/pdf',
    sizeBytes: 2048,
    status: 'APPROVED' as const,
    habilidadesBncc: ['EF01MA01'],
    uploadedById: 'u1',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  setSession()
})

describe('MaterialsPage', () => {
  it('lista os materiais do usuário', async () => {
    mockApi.get.mockResolvedValue({ data: [material()] })
    renderWithProviders(<MaterialsPage />)

    expect(await screen.findByText('Apostila de Álgebra')).toBeInTheDocument()
    expect(screen.getByText(/1 material encontrado/i)).toBeInTheDocument()
    expect(mockApi.get).toHaveBeenCalledWith('/mis/me')
  })

  it('mostra o estado vazio', async () => {
    mockApi.get.mockResolvedValue({ data: [] })
    renderWithProviders(<MaterialsPage />)
    expect(await screen.findByText(/Nenhum material enviado ainda/i)).toBeInTheDocument()
  })

  it('mostra o estado de erro', async () => {
    mockApi.get.mockRejectedValue(new Error('falha'))
    renderWithProviders(<MaterialsPage />)
    expect(await screen.findByText(/Não foi possível carregar os materiais/i)).toBeInTheDocument()
  })

  it('abre o material em nova aba via URL pré-assinada', async () => {
    mockApi.get.mockImplementation((url: string) => {
      if (url === '/mis/me') return Promise.resolve({ data: [material()] })
      return Promise.resolve({ data: { url: 'https://minio/x.pdf', expiresInSeconds: 60 } })
    })
    const openSpy = vi.fn()
    vi.stubGlobal('open', openSpy)
    const user = userEvent.setup()

    renderWithProviders(<MaterialsPage />)
    await user.click(await screen.findByRole('button', { name: /Visualizar Apostila de Álgebra/i }))

    await waitFor(() => expect(openSpy).toHaveBeenCalledWith('https://minio/x.pdf', '_blank', 'noopener,noreferrer'))
    vi.unstubAllGlobals()
  })
})
