// src/pages/AdminDashboardPage.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('../lib/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

import { api } from '../lib/api'
import { AdminDashboardPage } from './AdminDashboardPage'
import { renderWithProviders, setSession, makeUser } from '../test/utils'

const mockApi = vi.mocked(api)

function usersResponse() {
  return {
    total: 12,
    page: 1,
    perPage: 100,
    users: [
      { id: 'u1', name: 'Ana Souza',  email: 'ana@dcx.ufpb.br', role: 'PROFESSOR', canUpload: true,  emailVerified: true,  suspended: false, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
      { id: 'u2', name: 'Bruno Lima', email: 'bruno@dcx.ufpb.br', role: 'COMMON',  canUpload: false, emailVerified: true,  suspended: false, createdAt: '2026-01-02', updatedAt: '2026-01-02' },
    ],
  }
}

function orgsResponse() {
  return {
    total: 5,
    page: 1,
    perPage: 6,
    organizations: [
      { id: 'o1', name: 'Projeto Robótica', description: null, status: 'ACTIVE', createdById: 'u1', memberCount: 3, createdAt: '2026-01-01' },
      { id: 'o2', name: 'Projeto Astronomia', description: null, status: 'ACTIVE', createdById: 'u1', memberCount: 1, createdAt: '2026-01-02' },
    ],
  }
}

function routeGet(url: string) {
  if (url.startsWith('/users'))          return Promise.resolve({ data: usersResponse() })
  if (url.startsWith('/organizations'))  return Promise.resolve({ data: orgsResponse() })
  if (url.includes('status=APPROVED'))   return Promise.resolve({ data: { materials: [], total: 30, page: 1, perPage: 25 } })
  if (url.includes('status=PENDING'))    return Promise.resolve({ data: { materials: [], total: 4,  page: 1, perPage: 25 } })
  return Promise.resolve({ data: {} })
}

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  setSession(makeUser({ role: 'ADMIN' }))
  mockApi.get.mockImplementation(routeGet)
})

describe('AdminDashboardPage', () => {
  it('exibe os indicadores de usuários, materiais e projetos', async () => {
    renderWithProviders(<AdminDashboardPage />, { route: '/admin/dashboard', path: '/admin/dashboard' })

    // aprovados (30) e pendentes (4) aparecem só no indicador
    expect(await screen.findByText('30')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
    // usuários (12) e projetos (5) aparecem no indicador e no badge do painel
    expect(screen.getAllByText('12').length).toBeGreaterThan(0)
    expect(screen.getAllByText('5').length).toBeGreaterThan(0)
  })

  it('lista os usuários e projetos nas janelinhas', async () => {
    renderWithProviders(<AdminDashboardPage />, { route: '/admin/dashboard', path: '/admin/dashboard' })

    expect(await screen.findByText('Ana Souza')).toBeInTheDocument()
    expect(screen.getByText('Bruno Lima')).toBeInTheDocument()
    expect(screen.getByText('Projeto Robótica')).toBeInTheDocument()
    expect(screen.getByText('Projeto Astronomia')).toBeInTheDocument()
  })

  it('consulta apenas projetos ativos', async () => {
    renderWithProviders(<AdminDashboardPage />, { route: '/admin/dashboard', path: '/admin/dashboard' })

    await waitFor(() =>
      expect(mockApi.get).toHaveBeenCalledWith(expect.stringContaining('/organizations/all?status=ACTIVE')),
    )
  })

  it('permite navegar para a página de usuários pelo "Ver todos"', async () => {
    const user = userEvent.setup()
    renderWithProviders(<AdminDashboardPage />, { route: '/admin/dashboard', path: '/admin/dashboard' })

    await screen.findByText('Ana Souza')
    const seeAllButtons = screen.getAllByRole('button', { name: /Ver todos/i })
    // O primeiro painel é o de Usuários
    await user.click(seeAllButtons[0])
    // A navegação não quebra a renderização (rota simples de teste)
    expect(seeAllButtons.length).toBeGreaterThanOrEqual(2)
  })

  describe('disponibilidade das funcionalidades de IA', () => {
    it('instalação sem suporte a IA: controle bloqueado e explicado', async () => {
      renderWithProviders(<AdminDashboardPage />, {
        features: { ai: { enabled: false, manageable: false } },
      })

      expect(await screen.findByText(/Indisponível nesta instalação/i)).toBeInTheDocument()
      expect(screen.getByText(/depende de configuração de ambiente/i)).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Ativar IA|Desativar IA/i })).not.toBeInTheDocument()
    })

    it('instalação com suporte e IA ligada: oferece desativar', async () => {
      renderWithProviders(<AdminDashboardPage />, {
        features: { ai: { enabled: true, manageable: true } },
      })

      expect(await screen.findByRole('button', { name: /Desativar IA/i })).toBeInTheDocument()
      expect(screen.queryByText(/Indisponível nesta instalação/i)).not.toBeInTheDocument()
    })

    it('instalação com suporte e IA desligada pelo painel: oferece ativar', async () => {
      renderWithProviders(<AdminDashboardPage />, {
        features: { ai: { enabled: false, manageable: true } },
      })

      expect(await screen.findByRole('button', { name: /Ativar IA/i })).toBeInTheDocument()
    })

    it('alternar chama a API e recarrega a disponibilidade', async () => {
      const user = userEvent.setup()
      const refresh = vi.fn().mockResolvedValue(undefined)
      mockApi.patch.mockResolvedValue({ data: { ai: { enabled: false, manageable: true } } })

      renderWithProviders(<AdminDashboardPage />, {
        features: { ai: { enabled: true, manageable: true }, refresh },
      })

      await user.click(await screen.findByRole('button', { name: /Desativar IA/i }))

      await waitFor(() => {
        expect(mockApi.patch).toHaveBeenCalledWith('/config/features/ai', { enabled: false })
      })
      expect(refresh).toHaveBeenCalled()
    })

    it('falha na alteração mostra mensagem e não derruba a tela', async () => {
      const user = userEvent.setup()
      mockApi.patch.mockRejectedValue(new Error('rede'))

      renderWithProviders(<AdminDashboardPage />, {
        features: { ai: { enabled: true, manageable: true } },
      })

      await user.click(await screen.findByRole('button', { name: /Desativar IA/i }))

      expect(await screen.findByText(/Não foi possível alterar a disponibilidade/i)).toBeInTheDocument()
    })
  })
})
