// src/pages/ProfessorReviewPage.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('../lib/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

import { api } from '../lib/api'
import { ProfessorReviewPage } from './ProfessorReviewPage'
import { renderWithProviders, setSession, makeUser } from '../test/utils'

const mockApi = vi.mocked(api)

function pending(overrides = {}) {
  const now = new Date().toISOString()
  return {
    id: 'm1',
    title: 'Trabalho Pendente',
    originalFileName: 'trab.pdf',
    storageKey: 'k', mimeType: 'application/pdf', sizeBytes: 3000,
    status: 'PENDING_REVIEW' as const,
    habilidadesBncc: [],
    uploadedById: 'u1',
    uploadedBy: { name: 'Aluno X', email: 'aluno@dcx.ufpb.br' },
    createdAt: now, updatedAt: now,
    ...overrides,
  }
}

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  setSession(makeUser({ role: 'ADMIN', email: 'admin@dcx.ufpb.br' }))
})

describe('ProfessorReviewPage', () => {
  it('lista materiais pendentes', async () => {
    mockApi.get.mockResolvedValue({ data: [pending()] })
    renderWithProviders(<ProfessorReviewPage />)
    expect(await screen.findByText('Trabalho Pendente')).toBeInTheDocument()
    expect(mockApi.get).toHaveBeenCalledWith('/mis/pending')
  })

  it('mostra estado vazio quando não há pendências', async () => {
    mockApi.get.mockResolvedValue({ data: [] })
    renderWithProviders(<ProfessorReviewPage />)
    expect(await screen.findByText(/Nenhum material pendente/i)).toBeInTheDocument()
  })

  it('aprova um material com confirmação', async () => {
    mockApi.get.mockResolvedValue({ data: [pending()] })
    mockApi.patch.mockResolvedValue({ data: pending({ status: 'APPROVED' }) })
    const user = userEvent.setup()
    renderWithProviders(<ProfessorReviewPage />)

    await user.click(await screen.findByRole('button', { name: /Aprovar/i }))
    await user.click(screen.getByRole('button', { name: /Sim/i }))

    await waitFor(() =>
      expect(mockApi.patch).toHaveBeenCalledWith('/mis/m1/review', { decision: 'APPROVED' }),
    )
    expect(await screen.findByText('Aprovado')).toBeInTheDocument()
  })

  it('rejeita um material com confirmação', async () => {
    mockApi.get.mockResolvedValue({ data: [pending()] })
    mockApi.patch.mockResolvedValue({ data: pending({ status: 'REJECTED' }) })
    const user = userEvent.setup()
    renderWithProviders(<ProfessorReviewPage />)

    await user.click(await screen.findByRole('button', { name: /Rejeitar/i }))
    await user.click(screen.getByRole('button', { name: /Sim/i }))

    await waitFor(() =>
      expect(mockApi.patch).toHaveBeenCalledWith('/mis/m1/review', { decision: 'REJECTED' }),
    )
    expect(await screen.findByText('Rejeitado')).toBeInTheDocument()
  })

  it('visualiza o PDF do material pendente', async () => {
    mockApi.get.mockImplementation((url: string) => {
      if (url === '/mis/pending') return Promise.resolve({ data: [pending()] })
      return Promise.resolve({ data: { url: 'https://minio/t.pdf', expiresInSeconds: 60 } })
    })
    const openSpy = vi.fn()
    vi.stubGlobal('open', openSpy)
    const user = userEvent.setup()
    renderWithProviders(<ProfessorReviewPage />)

    await user.click(await screen.findByRole('button', { name: /Visualizar PDF/i }))
    await waitFor(() => expect(openSpy).toHaveBeenCalledWith('https://minio/t.pdf', '_blank', 'noopener,noreferrer'))
    vi.unstubAllGlobals()
  })
})
