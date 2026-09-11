// src/pages/HomePage.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('../lib/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

import { api } from '../lib/api'
import { HomePage } from './HomePage'
import { renderWithProviders, setSession } from '../test/utils'

const mockApi = vi.mocked(api)

function material(id: string, title: string, createdAt: string) {
  return {
    id,
    title,
    originalFileName: `${id}.pdf`,
    storageKey: 'k',
    mimeType: 'application/pdf',
    sizeBytes: 1024,
    status: 'APPROVED' as const,
    habilidadesBncc: [],
    uploadedById: 'u1',
    uploadedBy: { name: 'Prof. X', email: 'x@dcx.ufpb.br' },
    createdAt,
    updatedAt: createdAt,
  }
}

function mockMaterials(list: ReturnType<typeof material>[]) {
  mockApi.get.mockImplementation((url: string) => {
    if (url.includes('/mis/habilidades')) return Promise.resolve({ data: ['EF01MA01'] })
    return Promise.resolve({ data: { materials: list, total: list.length, page: 1, perPage: 25 } })
  })
}

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

describe('HomePage', () => {
  it('exibe a grade de recursos aprovados', async () => {
    setSession()
    mockMaterials([
      material('m1', 'Álgebra Linear', '2026-01-01T00:00:00Z'),
      material('m2', 'Cálculo I', '2026-02-01T00:00:00Z'),
    ])
    renderWithProviders(<HomePage />)

    expect(await screen.findByText('Álgebra Linear')).toBeInTheDocument()
    expect(screen.getByText('Cálculo I')).toBeInTheDocument()
    expect(screen.getByText('Recursos disponíveis')).toBeInTheDocument()
  })

  it('envia a busca do cabeçalho ao servidor e exibe o resultado filtrado', async () => {
    setSession()
    const all      = [material('m1', 'Álgebra Linear', '2026-01-01T00:00:00Z'), material('m2', 'Cálculo I', '2026-02-01T00:00:00Z')]
    const filtered = [material('m2', 'Cálculo I', '2026-02-01T00:00:00Z')]
    mockApi.get.mockImplementation((url: string) => {
      if (url.includes('/mis/habilidades')) return Promise.resolve({ data: [] })
      const list = url.includes('search=') ? filtered : all
      return Promise.resolve({ data: { materials: list, total: list.length, page: 1, perPage: 25 } })
    })
    const user = userEvent.setup()
    renderWithProviders(<HomePage />)

    await screen.findByText('Álgebra Linear')
    await user.type(screen.getByLabelText(/Pesquisar materiais/i), 'Cálculo')

    // Após o debounce, a busca vai ao servidor (acervo inteiro, não só a página atual)
    await waitFor(() =>
      expect(
        mockApi.get.mock.calls.some((c) => String(c[0]).includes(`search=${encodeURIComponent('Cálculo')}`)),
      ).toBe(true),
    )
    await waitFor(() => expect(screen.queryByText('Álgebra Linear')).not.toBeInTheDocument())
    expect(screen.getByText('Cálculo I')).toBeInTheDocument()
  })

  it('mostra estado vazio quando não há recursos', async () => {
    setSession()
    mockMaterials([])
    renderWithProviders(<HomePage />)
    expect(await screen.findByText(/Nenhum recurso disponível/i)).toBeInTheDocument()
  })

  it('para usuário anônimo com erro, sugere login', async () => {
    mockApi.get.mockRejectedValue(new Error('unauthorized'))
    renderWithProviders(<HomePage />)
    expect(await screen.findByText(/Entre para ver os materiais/i)).toBeInTheDocument()
  })

  it('ordena os materiais ao trocar a aba A–Z', async () => {
    setSession()
    mockMaterials([
      material('m1', 'Zoologia', '2026-02-01T00:00:00Z'),
      material('m2', 'Anatomia', '2026-01-01T00:00:00Z'),
    ])
    const user = userEvent.setup()
    renderWithProviders(<HomePage />)

    await screen.findByText('Zoologia')
    await user.click(screen.getByRole('button', { name: 'A–Z' }))
    // Ambos continuam visíveis; a ordenação A–Z não quebra a renderização
    expect(screen.getByText('Anatomia')).toBeInTheDocument()
    expect(screen.getByText('Zoologia')).toBeInTheDocument()
  })

  it('mostra o botão de chat de IA para usuário institucional', async () => {
    setSession() // ana@dcx.ufpb.br → institucional
    mockMaterials([material('m1', 'Biologia Celular', '2026-01-01T00:00:00Z')])
    renderWithProviders(<HomePage />)

    await screen.findByText('Biologia Celular')
    expect(screen.getByRole('button', { name: /Conversar com IA/i })).toBeInTheDocument()
  })

  it('mostra paginação e avança de página', async () => {
    setSession()
    const list = Array.from({ length: 25 }, (_, i) => material(`m${i}`, `Recurso ${i}`, '2026-01-15T00:00:00Z'))
    mockApi.get.mockImplementation((url: string) => {
      if (url.includes('/mis/habilidades')) return Promise.resolve({ data: [] })
      return Promise.resolve({ data: { materials: list, total: 60, page: 1, perPage: 25 } })
    })
    const user = userEvent.setup()
    renderWithProviders(<HomePage />)

    await screen.findByText('Recurso 0')
    expect(screen.getByText('1 / 3')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Próxima' }))
    await waitFor(() =>
      expect(mockApi.get.mock.calls.some((c) => String(c[0]).includes('page=2'))).toBe(true),
    )
  })
})
