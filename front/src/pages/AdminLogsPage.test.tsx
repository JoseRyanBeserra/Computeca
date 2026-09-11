// src/pages/AdminLogsPage.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('../lib/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

import { api } from '../lib/api'
import { AdminLogsPage } from './AdminLogsPage'
import { renderWithProviders, setSession, makeUser } from '../test/utils'

const mockApi = vi.mocked(api)

function log(overrides = {}) {
  return {
    id: 'l1',
    correlationId: 'user-123',
    context: 'createUserController',
    direction: 'CLIENT_TO_SERVER' as const,
    tag: null,
    payload: [{ title: 'Entrada de dados', content: { name: 'Ana' } }],
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  setSession(makeUser({ role: 'ADMIN', email: 'admin@dcx.ufpb.br' }))
})

describe('AdminLogsPage', () => {
  it('lista os logs de inspeção', async () => {
    mockApi.get.mockResolvedValue({ data: { logs: [log()], total: 1, page: 1, perPage: 50 } })
    renderWithProviders(<AdminLogsPage />)

    expect(await screen.findByText('createUserController')).toBeInTheDocument()
    expect(screen.getByText('Logs de Inspeção')).toBeInTheDocument()
    expect(mockApi.get.mock.calls[0][0]).toContain('/logs')
  })

  it('expande o payload do log', async () => {
    mockApi.get.mockResolvedValue({ data: { logs: [log()], total: 1, page: 1, perPage: 50 } })
    const user = userEvent.setup()
    renderWithProviders(<AdminLogsPage />)

    await user.click(await screen.findByRole('button', { name: /1 entrada/i }))
    expect(screen.getByText('Entrada de dados')).toBeInTheDocument()
  })

  it('mostra estado vazio', async () => {
    mockApi.get.mockResolvedValue({ data: { logs: [], total: 0, page: 1, perPage: 50 } })
    renderWithProviders(<AdminLogsPage />)
    expect(await screen.findByText(/Nenhum log encontrado para os filtros/i)).toBeInTheDocument()
  })

  it('aplica e limpa filtros', async () => {
    mockApi.get.mockResolvedValue({ data: { logs: [log()], total: 1, page: 1, perPage: 50 } })
    const user = userEvent.setup()
    renderWithProviders(<AdminLogsPage />)

    await screen.findByText('createUserController')
    await user.type(screen.getByPlaceholderText(/createUserController/i), 'authController')
    await user.click(screen.getByRole('button', { name: /Filtrar/i }))
    await waitFor(() =>
      expect(mockApi.get.mock.calls.some((c) => String(c[0]).includes('context=authController'))).toBe(true),
    )

    // "Limpar" aparece quando há filtro
    await user.click(screen.getByRole('button', { name: /Limpar/i }))
    expect(screen.getByPlaceholderText(/createUserController/i)).toHaveValue('')
  })

  it('destaca logs com tag de IA (RAG)', async () => {
    mockApi.get.mockResolvedValue({ data: { logs: [log({ id: 'l2', tag: 'AI_RAG', direction: 'SERVER_TO_CLIENT' })], total: 1, page: 1, perPage: 50 } })
    renderWithProviders(<AdminLogsPage />)
    expect(await screen.findByText('IA · RAG')).toBeInTheDocument()
  })

  it('mostra o estado de erro', async () => {
    mockApi.get.mockRejectedValue(new Error('falha'))
    renderWithProviders(<AdminLogsPage />)
    expect(await screen.findByText(/Falha ao carregar os logs/i)).toBeInTheDocument()
  })
})
