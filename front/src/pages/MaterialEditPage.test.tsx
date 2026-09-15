// src/pages/MaterialEditPage.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('../lib/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

import { api } from '../lib/api'
import { MaterialEditPage } from './MaterialEditPage'
import { renderWithProviders, setSession, makeUser } from '../test/utils'

const mockApi = vi.mocked(api)

const DESCRICAO = 'd'.repeat(60)

const material = {
  id:               'm1',
  title:            'Título original',
  description:      DESCRICAO,
  originalFileName: 'documento.pdf',
  storageKey:       'chave-antiga',
  mimeType:         'application/pdf',
  sizeBytes:        2048,
  status:           'APPROVED' as const,
  habilidadesBncc:  ['EF06CO01'],
  uploadedById:     'u1',
  uploadedBy:       { name: 'Ana Souza', email: 'ana@dcx.ufpb.br' },
  organizations:    [],
  createdAt:        new Date().toISOString(),
  updatedAt:        new Date().toISOString(),
}

function renderEdit(override: Partial<typeof material> = {}) {
  mockApi.get.mockResolvedValue({ data: { ...material, ...override } })
  return renderWithProviders(<MaterialEditPage />, {
    route: '/materials/m1/edit',
    path:  '/materials/:id/edit',
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  setSession(makeUser({ role: 'ADMIN' }))
})

describe('MaterialEditPage', () => {
  it('abre preenchida com os valores atuais do material (FR-020)', async () => {
    renderEdit()

    const titulo = await screen.findByLabelText(/Título/i)
    expect(titulo).toHaveValue('Título original')
    expect(screen.getByLabelText(/Descrição/i)).toHaveValue(DESCRICAO)
    expect(screen.getByText('EF06CO01')).toBeInTheDocument()
    // O nome do documento atual aparece, para quem edita saber o que substituiria
    expect(screen.getByText(/documento\.pdf/i)).toBeInTheDocument()
  })

  it('deixa o campo de descrição vazio em material anterior à exigência', async () => {
    renderEdit({ description: null as unknown as string })

    await screen.findByLabelText(/Título/i)
    expect(screen.getByLabelText(/Descrição/i)).toHaveValue('')
    expect(screen.getByText(/Faltam 50 caracteres/i)).toBeInTheDocument()
  })

  it('impede salvar com título vazio', async () => {
    renderEdit()

    const titulo = await screen.findByLabelText(/Título/i)
    fireEvent.change(titulo, { target: { value: '' } })

    expect(screen.getByRole('button', { name: /Salvar alterações/i })).toBeDisabled()
  })

  it('impede salvar com descrição abaixo do mínimo, informando a regra antes do envio', async () => {
    renderEdit()

    const descricao = await screen.findByLabelText(/Descrição/i)
    fireEvent.change(descricao, { target: { value: 'curta' } })

    expect(screen.getByText(/Faltam 45 caracteres/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Salvar alterações/i })).toBeDisabled()
    expect(mockApi.put).not.toHaveBeenCalled()
  })

  it('salva os metadados sem enviar arquivo quando nenhum foi escolhido', async () => {
    renderEdit()
    mockApi.put.mockResolvedValue({ data: { ...material, title: 'Título novo' } })

    const titulo = await screen.findByLabelText(/Título/i)
    fireEvent.change(titulo, { target: { value: 'Título novo' } })
    fireEvent.click(screen.getByRole('button', { name: /Salvar alterações/i }))

    await waitFor(() => expect(mockApi.put).toHaveBeenCalled())

    const [url, formData] = mockApi.put.mock.calls[0]
    expect(url).toBe('/mis/m1')
    const fd = formData as FormData
    expect(fd.get('title')).toBe('Título novo')
    expect(fd.get('description')).toBe(DESCRICAO)
    // Ausência do campo é o que diz ao servidor "mantenha o documento atual"
    expect(fd.has('file')).toBe(false)
  })

  it('exige confirmação explícita antes de substituir o documento (FR-012)', async () => {
    renderEdit()
    const user = userEvent.setup()

    await screen.findByLabelText(/Título/i)
    const arquivo = new File(['%PDF-1.7'], 'novo.pdf', { type: 'application/pdf' })
    await user.upload(screen.getByLabelText(/Documento/i), arquivo)

    fireEvent.click(screen.getByRole('button', { name: /Salvar alterações/i }))

    // Nada foi enviado ainda: apareceu a confirmação
    expect(mockApi.put).not.toHaveBeenCalled()
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument()
    expect(screen.getByText(/apagado definitivamente/i)).toBeInTheDocument()
  })

  it('recusar a confirmação não envia nada', async () => {
    renderEdit()
    const user = userEvent.setup()

    await screen.findByLabelText(/Título/i)
    const arquivo = new File(['%PDF-1.7'], 'novo.pdf', { type: 'application/pdf' })
    await user.upload(screen.getByLabelText(/Documento/i), arquivo)
    fireEvent.click(screen.getByRole('button', { name: /Salvar alterações/i }))

    await screen.findByRole('alertdialog')
    fireEvent.click(screen.getByRole('button', { name: /Cancelar/i }))

    await waitFor(() =>
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument(),
    )
    expect(mockApi.put).not.toHaveBeenCalled()
  })

  it('confirmada a substituição, o arquivo segue na requisição', async () => {
    renderEdit()
    mockApi.put.mockResolvedValue({ data: material })
    const user = userEvent.setup()

    await screen.findByLabelText(/Título/i)
    const arquivo = new File(['%PDF-1.7'], 'novo.pdf', { type: 'application/pdf' })
    await user.upload(screen.getByLabelText(/Documento/i), arquivo)
    fireEvent.click(screen.getByRole('button', { name: /Salvar alterações/i }))

    await screen.findByRole('alertdialog')
    fireEvent.click(screen.getByRole('button', { name: /Sim, substituir/i }))

    await waitFor(() => expect(mockApi.put).toHaveBeenCalled())
    const fd = mockApi.put.mock.calls[0][1] as FormData
    expect(fd.get('file')).toBe(arquivo)
  })

  it('avisa que material aprovado volta para revisão ao trocar o documento', async () => {
    renderEdit({ status: 'APPROVED' })
    const user = userEvent.setup()

    await screen.findByLabelText(/Título/i)
    const arquivo = new File(['%PDF-1.7'], 'novo.pdf', { type: 'application/pdf' })
    await user.upload(screen.getByLabelText(/Documento/i), arquivo)

    expect(screen.getByText(/devolve para\s+revisão/i)).toBeInTheDocument()
  })

  // Feature 006 — a edição usa o mesmo catálogo completo do cadastro (FR-008).
  it('o seletor de habilidades encontra uma habilidade da Educação Infantil', async () => {
    renderEdit()
    const user = userEvent.setup()

    await user.type(await screen.findByLabelText(/Habilidades BNCC/i), 'EI03CO03')

    expect(await screen.findByRole('option', { name: /EI03CO03/ })).toBeInTheDocument()
  })

  // Feature 004 — os links relacionados também são editáveis.
  describe('links relacionados', () => {
    const LINKS = [
      { label: 'Videoaula', url: 'https://exemplo.org/aula' },
      { label: 'Planilha',  url: 'https://exemplo.org/planilha' },
    ]

    it('abre com os links atuais do material', async () => {
      renderEdit({ relatedLinks: LINKS } as Partial<typeof material>)

      expect(await screen.findByRole('button', { name: 'Remover link Videoaula' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Remover link Planilha' })).toBeInTheDocument()
    })

    it('envia a lista editada como array JSON — acréscimo e remoção', async () => {
      renderEdit({ relatedLinks: LINKS } as Partial<typeof material>)
      mockApi.put.mockResolvedValue({ data: material })

      await screen.findByRole('button', { name: 'Remover link Videoaula' })
      fireEvent.click(screen.getByRole('button', { name: 'Remover link Videoaula' }))
      fireEvent.change(screen.getByLabelText('Nome do link'), { target: { value: 'Artigo' } })
      fireEvent.change(screen.getByLabelText('Endereço do link'), { target: { value: 'https://exemplo.org/artigo' } })
      fireEvent.click(screen.getByRole('button', { name: /Acrescentar link/i }))
      fireEvent.click(screen.getByRole('button', { name: /Salvar alterações/i }))

      await waitFor(() => expect(mockApi.put).toHaveBeenCalled())
      const fd = mockApi.put.mock.calls[0][1] as FormData
      expect(JSON.parse(fd.get('relatedLinks') as string)).toEqual([
        { label: 'Planilha', url: 'https://exemplo.org/planilha' },
        { label: 'Artigo',   url: 'https://exemplo.org/artigo' },
      ])
    })

    it('removidos todos, envia lista vazia — é o que diz ao servidor para apagá-los', async () => {
      renderEdit({ relatedLinks: [LINKS[0]] } as Partial<typeof material>)
      mockApi.put.mockResolvedValue({ data: material })

      fireEvent.click(await screen.findByRole('button', { name: 'Remover link Videoaula' }))
      fireEvent.click(screen.getByRole('button', { name: /Salvar alterações/i }))

      await waitFor(() => expect(mockApi.put).toHaveBeenCalled())
      const fd = mockApi.put.mock.calls[0][1] as FormData
      expect(fd.get('relatedLinks')).toBe('[]')
    })
  })
})
