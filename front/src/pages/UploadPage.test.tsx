// src/pages/UploadPage.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('../lib/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

import { api } from '../lib/api'
import { UploadPage } from './UploadPage'
import { renderWithProviders, setSession, makeUser } from '../test/utils'

const mockApi = vi.mocked(api)

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  // useMyOrganizations é chamado no render — devolve lista vazia por padrão
  mockApi.get.mockResolvedValue({ data: [] })
})

/** Descrição válida (>= 50 caracteres), obrigatória desde a feature 003. */
const DESCRICAO_VALIDA =
  'Material instrucional de teste com conteudo suficiente para validacao.'

/**
 * Preenche título e descrição, ambos obrigatórios desde a feature 003 — sem
 * eles o botão de envio permanece bloqueado.
 */
function preencherObrigatorios() {
  // `fireEvent.change` em vez de `user.type`: digitar 70 caracteres um a um
  // leva segundos e fazia estes casos estourarem o tempo limite quando a suíte
  // inteira roda junto. O handler de onChange é exercitado do mesmo jeito.
  //
  // Selecionar o arquivo pré-preenche o título com o nome dele — uma sugestão
  // editável, distinta do servidor adivinhar.
  fireEvent.change(screen.getByLabelText(/Título/i), { target: { value: 'Material de teste' } })
  fireEvent.change(screen.getByLabelText(/Descrição/i), { target: { value: DESCRICAO_VALIDA } })
}

describe('UploadPage', () => {
  it('avisa quando o usuário não tem permissão de upload', () => {
    setSession(makeUser({ role: 'COMMON', email: 'comum@gmail.com', canUpload: false }))
    renderWithProviders(<UploadPage />, { route: '/upload' })
    expect(screen.getByText(/Permissão de upload não habilitada/i)).toBeInTheDocument()
  })

  it('seleciona uma habilidade da lista da BNCC de Computação e remove', async () => {
    setSession(makeUser({ role: 'PROFESSOR' }))
    const user = userEvent.setup()
    renderWithProviders(<UploadPage />, { route: '/upload' })

    await user.type(screen.getByLabelText(/Habilidades BNCC/i), 'EF06CO02')
    // sugestão da BNCC aparece no dropdown
    await user.click(await screen.findByRole('option', { name: /EF06CO02/i }))
    // vira uma tag removível
    expect(screen.getByRole('button', { name: /Remover EF06CO02/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Remover EF06CO02/i }))
    expect(screen.queryByRole('button', { name: /Remover EF06CO02/i })).not.toBeInTheDocument()
  })

  it('permite adicionar uma habilidade personalizada fora da lista', async () => {
    setSession(makeUser({ role: 'PROFESSOR' }))
    const user = userEvent.setup()
    renderWithProviders(<UploadPage />, { route: '/upload' })

    await user.type(screen.getByLabelText(/Habilidades BNCC/i), 'minha-hab-01')
    await user.click(await screen.findByRole('button', { name: /Adicionar habilidade personalizada/i }))
    // adicionada como código normalizado (maiúsculas)
    expect(screen.getByRole('button', { name: /Remover MINHA-HAB-01/i })).toBeInTheDocument()
  })

  it('envia o material com o arquivo selecionado', async () => {
    setSession(makeUser({ role: 'PROFESSOR' }))
    mockApi.post.mockResolvedValue({
      data: { id: 'm1', title: 'meu-doc', originalFileName: 'doc.pdf', storageKey: 'k', mimeType: 'application/pdf', sizeBytes: 10, status: 'PENDING_REVIEW', habilidadesBncc: [], uploadedById: 'u1', createdAt: '', updatedAt: '' },
    })
    const user = userEvent.setup()
    const { container } = renderWithProviders(<UploadPage />, { route: '/upload' })

    const file = new File(['conteúdo'], 'doc.pdf', { type: 'application/pdf' })
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, file)
    preencherObrigatorios()

    await user.click(screen.getByRole('button', { name: /Enviar Material/i }))

    await waitFor(() => expect(mockApi.post).toHaveBeenCalled())
    expect(mockApi.post.mock.calls[0][0]).toBe('/mis')
    expect(await screen.findByText(/Material enviado com sucesso/i)).toBeInTheDocument()
  })

  it('mostra o seletor de projeto quando há organizações ativas', async () => {
    setSession(makeUser({ role: 'PROFESSOR' }))
    mockApi.get.mockResolvedValue({
      data: [{ id: 'o1', name: 'Projeto Ativo', description: null, status: 'ACTIVE', myRole: 'ADMIN', memberCount: 1, createdAt: '' }],
    })
    renderWithProviders(<UploadPage />, { route: '/upload' })
    expect(await screen.findByText(/Destinar a um projeto/i)).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Projeto Ativo' })).toBeInTheDocument()
  })

  it('exibe erro amigável quando o upload falha', async () => {
    setSession(makeUser({ role: 'PROFESSOR' }))
    mockApi.post.mockRejectedValue(new Error('boom'))
    const user = userEvent.setup()
    const { container } = renderWithProviders(<UploadPage />, { route: '/upload' })

    const file = new File(['x'], 'doc.pdf', { type: 'application/pdf' })
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, file)
    preencherObrigatorios()
    await user.click(screen.getByRole('button', { name: /Enviar Material/i }))

    expect(await screen.findByText(/Ocorreu um erro inesperado/i)).toBeInTheDocument()
  })

  describe('descrição obrigatória', () => {
    async function prepararComArquivo(user: ReturnType<typeof userEvent.setup>) {
      const { container } = renderWithProviders(<UploadPage />, { route: '/upload' })
      const file = new File(['x'], 'doc.pdf', { type: 'application/pdf' })
      const input = container.querySelector('input[type="file"]') as HTMLInputElement
      await user.upload(input, file)
      return container
    }

    it('bloqueia o envio com descrição vazia, e a exigência é visível antes da tentativa', async () => {
      setSession(makeUser({ role: 'PROFESSOR' }))
      const user = userEvent.setup()
      await prepararComArquivo(user)

      // A regra aparece enquanto se escreve, não após uma recusa (SC-004).
      expect(screen.getByText(/Faltam 50 caracteres para o mínimo de 50/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Enviar Material/i })).toBeDisabled()
    })

    it('o contador indica quanto falta enquanto a descrição é curta', async () => {
      setSession(makeUser({ role: 'PROFESSOR' }))
      const user = userEvent.setup()
      await prepararComArquivo(user)

      fireEvent.change(screen.getByLabelText(/Descrição/i), { target: { value: 'a'.repeat(30) } })

      expect(screen.getByText(/Faltam 20 caracteres para o mínimo de 50/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Enviar Material/i })).toBeDisabled()
    })

    it('libera o envio quando título e descrição são válidos', async () => {
      setSession(makeUser({ role: 'PROFESSOR' }))
      const user = userEvent.setup()
      await prepararComArquivo(user)

      preencherObrigatorios()

      expect(screen.getByRole('button', { name: /Enviar Material/i })).toBeEnabled()
      expect(screen.getByText(/de 2000 caracteres/i)).toBeInTheDocument()
    })

    it('bloqueia o envio quando o título é apagado, mesmo com descrição válida', async () => {
      setSession(makeUser({ role: 'PROFESSOR' }))
      const user = userEvent.setup()
      await prepararComArquivo(user)

      fireEvent.change(screen.getByLabelText(/Descrição/i), { target: { value: DESCRICAO_VALIDA } })
      // O título vem pré-preenchido com o nome do arquivo; apagá-lo bloqueia.
      await user.clear(screen.getByLabelText(/Título/i))

      expect(screen.getByRole('button', { name: /Enviar Material/i })).toBeDisabled()
    })

    it('envia a descrição na requisição', async () => {
      setSession(makeUser({ role: 'PROFESSOR' }))
      mockApi.post.mockResolvedValue({ data: { id: 'm1' } })
      const user = userEvent.setup()
      await prepararComArquivo(user)

      preencherObrigatorios()
      await user.click(screen.getByRole('button', { name: /Enviar Material/i }))

      await waitFor(() => expect(mockApi.post).toHaveBeenCalled())
      const fd = mockApi.post.mock.calls[0][1] as FormData
      expect(fd.get('description')).toBe(DESCRICAO_VALIDA)
      expect(fd.get('title')).toBe('Material de teste')
    })
  })

  // Feature 004 — links relacionados. Asseverar o CONTEÚDO do FormData, não só
  // que houve POST (ver front/CLAUDE.md, "Cadastro de material").
  describe('links relacionados', () => {
    async function prepararComArquivo(user: ReturnType<typeof userEvent.setup>) {
      const { container } = renderWithProviders(<UploadPage />, { route: '/upload' })
      const file = new File(['x'], 'doc.pdf', { type: 'application/pdf' })
      const input = container.querySelector('input[type="file"]') as HTMLInputElement
      await user.upload(input, file)
      preencherObrigatorios()
    }

    it('o cadastro conclui sem nenhum link — eles são opcionais (FR-002)', async () => {
      setSession(makeUser({ role: 'PROFESSOR' }))
      mockApi.post.mockResolvedValue({ data: { id: 'm1', title: 'Material de teste', originalFileName: 'doc.pdf', sizeBytes: 1 } })
      const user = userEvent.setup()
      await prepararComArquivo(user)

      await user.click(screen.getByRole('button', { name: /Enviar Material/i }))

      await waitFor(() => expect(mockApi.post).toHaveBeenCalled())
      const fd = mockApi.post.mock.calls[0][1] as FormData
      expect(fd.has('relatedLinks')).toBe(false)
      expect(await screen.findByText(/Material enviado com sucesso/i)).toBeInTheDocument()
    })

    it('os links informados seguem como array JSON no campo relatedLinks', async () => {
      setSession(makeUser({ role: 'PROFESSOR' }))
      mockApi.post.mockResolvedValue({ data: { id: 'm1' } })
      const user = userEvent.setup()
      await prepararComArquivo(user)

      for (const [label, url] of [
        ['Videoaula', 'https://exemplo.org/aula'],
        ['Planilha',  'https://exemplo.org/planilha'],
      ]) {
        fireEvent.change(screen.getByLabelText('Nome do link'), { target: { value: label } })
        fireEvent.change(screen.getByLabelText('Endereço do link'), { target: { value: url } })
        await user.click(screen.getByRole('button', { name: /Acrescentar link/i }))
      }
      await user.click(screen.getByRole('button', { name: /Enviar Material/i }))

      await waitFor(() => expect(mockApi.post).toHaveBeenCalled())
      const fd = mockApi.post.mock.calls[0][1] as FormData
      expect(JSON.parse(fd.get('relatedLinks') as string)).toEqual([
        { label: 'Videoaula', url: 'https://exemplo.org/aula' },
        { label: 'Planilha',  url: 'https://exemplo.org/planilha' },
      ])
    })
  })
})
