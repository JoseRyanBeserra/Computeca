// src/pages/OrganizationDetailPage.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('../lib/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

import { api } from '../lib/api'
import { OrganizationDetailPage } from './OrganizationDetailPage'
import { renderWithProviders, setSession, makeUser } from '../test/utils'

const mockApi = vi.mocked(api)

const org = {
  id: 'o1',
  name: 'Projeto Gamma',
  description: 'Projeto de teste',
  status: 'ACTIVE' as const,
  myRole: 'ADMIN' as const,
  memberCount: 2,
  createdAt: new Date().toISOString(),
}

const members = [
  { id: 'mem1', organizationId: 'o1', userId: 'u1', role: 'ADMIN' as const, joinedAt: '', user: { name: 'Ana Souza', email: 'ana@dcx.ufpb.br' } },
  { id: 'mem2', organizationId: 'o1', userId: 'u2', role: 'MEMBER' as const, joinedAt: '', user: { name: 'Beto Lima', email: 'beto@dcx.ufpb.br' } },
]

const materials = [
  { id: 'mat1', title: 'PDF do Projeto', originalFileName: 'p.pdf', storageKey: 'k', mimeType: 'application/pdf', sizeBytes: 2048, status: 'APPROVED' as const, uploadedById: 'u1', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
]

function mockGets() {
  mockApi.get.mockImplementation((url: string) => {
    if (url === '/organizations/mine') return Promise.resolve({ data: [org] })
    if (url.endsWith('/members')) return Promise.resolve({ data: members })
    if (url.endsWith('/materials')) return Promise.resolve({ data: materials })
    return Promise.resolve({ data: {} })
  })
}

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  setSession(makeUser({ id: 'u1', role: 'PROFESSOR' }))
})

describe('OrganizationDetailPage', () => {
  it('renderiza cabeçalho, membros e materiais do projeto', async () => {
    mockGets()
    renderWithProviders(<OrganizationDetailPage />, { route: '/organizations/o1', path: '/organizations/:orgId' })

    expect(await screen.findByText('Projeto Gamma')).toBeInTheDocument()
    expect(await screen.findByText('Beto Lima')).toBeInTheDocument()
    expect(await screen.findByText('PDF do Projeto')).toBeInTheDocument()
  })

  it('convida um membro', async () => {
    mockGets()
    mockApi.post.mockResolvedValue({ data: { id: 'i1' } })
    const user = userEvent.setup()
    renderWithProviders(<OrganizationDetailPage />, { route: '/organizations/o1', path: '/organizations/:orgId' })

    await screen.findByText('Projeto Gamma')
    await user.type(screen.getByPlaceholderText('email@dcx.ufpb.br'), 'novo@dcx.ufpb.br')
    await user.click(screen.getByRole('button', { name: /Convidar/i }))

    await waitFor(() =>
      expect(mockApi.post).toHaveBeenCalledWith('/organizations/o1/invites', { email: 'novo@dcx.ufpb.br' }),
    )
    expect(await screen.findByText(/Convite enviado para novo@dcx.ufpb.br/i)).toBeInTheDocument()
  })

  it('edita o nome do projeto', async () => {
    mockGets()
    mockApi.put.mockResolvedValue({ data: { ...org, name: 'Projeto Renomeado' } })
    const user = userEvent.setup()
    renderWithProviders(<OrganizationDetailPage />, { route: '/organizations/o1', path: '/organizations/:orgId' })

    await user.click(await screen.findByRole('button', { name: /Editar/i }))
    const nameInput = screen.getByPlaceholderText('Nome do projeto')
    await user.clear(nameInput)
    await user.type(nameInput, 'Projeto Renomeado')
    await user.click(screen.getByRole('button', { name: /Salvar/i }))

    await waitFor(() =>
      expect(mockApi.put).toHaveBeenCalledWith('/organizations/o1', { name: 'Projeto Renomeado', description: 'Projeto de teste' }),
    )
  })

  it('mostra "Projeto não encontrado" quando o id não existe', async () => {
    mockApi.get.mockImplementation((url: string) => {
      if (url === '/organizations/mine') return Promise.resolve({ data: [] })
      return Promise.resolve({ data: [] })
    })
    renderWithProviders(<OrganizationDetailPage />, { route: '/organizations/zzz', path: '/organizations/:orgId' })
    expect(await screen.findByText(/Projeto não encontrado/i)).toBeInTheDocument()
  })

  it('remove um membro (admin) após confirmação', async () => {
    mockGets()
    mockApi.delete.mockResolvedValue({ data: undefined })
    vi.stubGlobal('confirm', vi.fn(() => true))
    const user = userEvent.setup()
    renderWithProviders(<OrganizationDetailPage />, { route: '/organizations/o1', path: '/organizations/:orgId' })

    await screen.findByText('Beto Lima')
    await user.click(screen.getByRole('button', { name: /Remover membro/i }))
    await waitFor(() => expect(mockApi.delete).toHaveBeenCalledWith('/organizations/o1/members/u2'))
    vi.unstubAllGlobals()
  })

  it('arquiva o projeto (admin) após confirmação', async () => {
    mockGets()
    mockApi.delete.mockResolvedValue({ data: { ...org, status: 'ARCHIVED' } })
    vi.stubGlobal('confirm', vi.fn(() => true))
    const user = userEvent.setup()
    renderWithProviders(<OrganizationDetailPage />, { route: '/organizations/o1', path: '/organizations/:orgId' })

    await user.click(await screen.findByRole('button', { name: /Arquivar/i }))
    await waitFor(() => expect(mockApi.delete).toHaveBeenCalledWith('/organizations/o1'))
    vi.unstubAllGlobals()
  })

  it('envia material para o projeto', async () => {
    mockGets()
    mockApi.post.mockResolvedValue({ data: { id: 'mat9', title: 'Novo PDF', originalFileName: 'n.pdf', storageKey: 'k', mimeType: 'application/pdf', sizeBytes: 10, status: 'PENDING_REVIEW', uploadedById: 'u1', createdAt: '', updatedAt: '' } })
    const user = userEvent.setup()
    const { container } = renderWithProviders(<OrganizationDetailPage />, { route: '/organizations/o1', path: '/organizations/:orgId' })

    await screen.findByText('Projeto Gamma')
    const file = new File(['x'], 'n.pdf', { type: 'application/pdf' })
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(fileInput, file)
    // aguarda o estado do arquivo ser refletido na UI antes de submeter
    expect(await screen.findByText(/n\.pdf —/i)).toBeInTheDocument()
    // submete o form diretamente — o input[type=file] required faz o jsdom
    // bloquear o submit nativo por constraint validation.
    fireEvent.submit(fileInput.closest('form')!)

    await waitFor(() => expect(mockApi.post).toHaveBeenCalled())
    expect(mockApi.post.mock.calls[0][0]).toBe('/organizations/o1/mis')
    expect(await screen.findByText(/enviado para revisão/i)).toBeInTheDocument()
  })

  it('abre o PDF de um material do projeto', async () => {
    mockGets()
    mockApi.get.mockImplementation((url: string) => {
      if (url === '/organizations/mine') return Promise.resolve({ data: [org] })
      if (url.endsWith('/members')) return Promise.resolve({ data: members })
      if (url.endsWith('/materials')) return Promise.resolve({ data: materials })
      return Promise.resolve({ data: { url: 'https://minio/p.pdf', expiresInSeconds: 60 } })
    })
    const openSpy = vi.fn()
    vi.stubGlobal('open', openSpy)
    const user = userEvent.setup()
    renderWithProviders(<OrganizationDetailPage />, { route: '/organizations/o1', path: '/organizations/:orgId' })

    await user.click(await screen.findByRole('button', { name: /Abrir PDF/i }))
    await waitFor(() => expect(openSpy).toHaveBeenCalledWith('https://minio/p.pdf', '_blank', 'noopener,noreferrer'))
    vi.unstubAllGlobals()
  })
})
