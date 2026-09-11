// src/pages/AllMaterialsPage.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('../lib/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

import { api } from '../lib/api'
import { AllMaterialsPage } from './AllMaterialsPage'
import { renderWithProviders, setSession, makeUser } from '../test/utils'

const mockApi = vi.mocked(api)

function material(id: string, title: string) {
  const now = new Date().toISOString()
  return {
    id, title,
    originalFileName: `${id}.pdf`,
    storageKey: 'k', mimeType: 'application/pdf', sizeBytes: 4096,
    status: 'PENDING_REVIEW' as const,
    habilidadesBncc: [],
    uploadedById: 'u1',
    uploadedBy: { name: 'Prof. Y', email: 'y@dcx.ufpb.br' },
    createdAt: now, updatedAt: now,
  }
}

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  setSession(makeUser({ role: 'ADMIN', email: 'admin@dcx.ufpb.br' }))
})

describe('AllMaterialsPage', () => {
  it('lista todos os materiais', async () => {
    mockApi.get.mockResolvedValue({ data: { materials: [material('m1', 'Doc A')], total: 1, page: 1, perPage: 25 } })
    renderWithProviders(<AllMaterialsPage />)

    expect(await screen.findByText('Doc A')).toBeInTheDocument()
    expect(screen.getByText('Todos os Materiais')).toBeInTheDocument()
    expect(mockApi.get.mock.calls[0][0]).toContain('/mis/all')
  })

  it('filtra por status ao trocar de aba', async () => {
    mockApi.get.mockResolvedValue({ data: { materials: [], total: 0, page: 1, perPage: 25 } })
    const user = userEvent.setup()
    renderWithProviders(<AllMaterialsPage />)

    await screen.findByText('Todos os Materiais')
    await user.click(screen.getByRole('button', { name: 'Aprovados' }))

    await waitFor(() =>
      expect(mockApi.get.mock.calls.some((c) => String(c[0]).includes('status=APPROVED'))).toBe(true),
    )
  })

  it('abre o PDF via URL de revisão', async () => {
    mockApi.get.mockImplementation((url: string) => {
      if (url.includes('/mis/all')) return Promise.resolve({ data: { materials: [material('m1', 'Doc A')], total: 1, page: 1, perPage: 25 } })
      return Promise.resolve({ data: { url: 'https://minio/a.pdf', expiresInSeconds: 60 } })
    })
    const openSpy = vi.fn()
    vi.stubGlobal('open', openSpy)
    const user = userEvent.setup()
    renderWithProviders(<AllMaterialsPage />)

    await user.click(await screen.findByRole('button', { name: /Visualizar Doc A/i }))
    await waitFor(() => expect(openSpy).toHaveBeenCalledWith('https://minio/a.pdf', '_blank', 'noopener,noreferrer'))
    expect(mockApi.get).toHaveBeenCalledWith('/mis/m1/review-presigned-url')
    vi.unstubAllGlobals()
  })

  it('navega entre páginas', async () => {
    mockApi.get.mockResolvedValue({ data: { materials: [material('m1', 'Doc A')], total: 60, page: 1, perPage: 25 } })
    const user = userEvent.setup()
    renderWithProviders(<AllMaterialsPage />)

    await screen.findByText('Doc A')
    await user.click(screen.getByRole('button', { name: 'Próxima' }))
    await waitFor(() =>
      expect(mockApi.get.mock.calls.some((c) => String(c[0]).includes('page=2'))).toBe(true),
    )
  })

  describe('soft delete', () => {
    it('admin/professor faz soft delete com confirmação', async () => {
      mockApi.get.mockResolvedValue({ data: { materials: [material('m1', 'Doc A')], total: 1, page: 1, perPage: 25 } })
      mockApi.delete.mockResolvedValue({ data: {} })
      const user = userEvent.setup()
      renderWithProviders(<AllMaterialsPage />)

      // Passo 1: clicar em Excluir revela a confirmação
      await user.click(await screen.findByRole('button', { name: /Excluir Doc A/i }))
      const confirmBtn = await screen.findByRole('button', { name: /Confirmar exclusão de Doc A/i })

      // Passo 2: confirmar chama o DELETE do material
      await user.click(confirmBtn)
      await waitFor(() => expect(mockApi.delete).toHaveBeenCalledWith('/mis/m1'))
    })

    it('não mostra o botão Excluir para quem não é admin/professor', async () => {
      setSession(makeUser({ role: 'INSTITUTIONALIZED', email: 'inst@dcx.ufpb.br' }))
      mockApi.get.mockResolvedValue({ data: { materials: [material('m1', 'Doc A')], total: 1, page: 1, perPage: 25 } })
      renderWithProviders(<AllMaterialsPage />)

      await screen.findByText('Doc A')
      expect(screen.queryByRole('button', { name: /Excluir Doc A/i })).not.toBeInTheDocument()
    })
  })
})
