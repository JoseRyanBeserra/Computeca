// src/components/PdfPreview.test.tsx
//
// ATENÇÃO ao fallback do <object>: no jsdom o elemento nunca falha ao carregar e
// seus filhos permanecem sempre no DOM. Por isso os testes asseveram pelos
// ATRIBUTOS (`data`, `type`), nunca pela presença ou ausência do texto de
// fallback — que estaria presente também no estado de sucesso, tornando a
// asserção vazia. O comportamento do fallback só é verificável manualmente.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('../lib/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

import { api } from '../lib/api'
import { PdfPreview } from './PdfPreview'
import { renderWithProviders, setSession, makeUser } from '../test/utils'

const mockApi = vi.mocked(api)
const URL_DO_ARQUIVO = 'https://armazenamento/materiais/guia.pdf'

type Listener = (event: MediaQueryListEvent) => void

/** Dublê de matchMedia — o jsdom não o implementa. */
function stubLargura({ estreita }: { estreita: boolean }) {
  const listeners = new Set<Listener>()
  window.matchMedia = vi.fn(() => ({
    matches: estreita,
    media: '(max-width: 767px)',
    addEventListener: (_: string, l: Listener) => { listeners.add(l) },
    removeEventListener: (_: string, l: Listener) => { listeners.delete(l) },
  })) as unknown as typeof window.matchMedia
}

function renderPreview(onOpenFullscreen = vi.fn()) {
  renderWithProviders(
    <PdfPreview
      materialId="m1"
      materialStatus="APPROVED"
      onOpenFullscreen={onOpenFullscreen}
      title="Guia de Geometria"
    />,
  )
  return { onOpenFullscreen }
}

/** O <object> não tem papel acessível — localiza pelo atributo. */
function objetoDoDocumento(): HTMLObjectElement | null {
  return document.querySelector('object[type="application/pdf"]')
}

const originalMatchMedia = window.matchMedia

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  setSession(makeUser({ role: 'PROFESSOR' }))
  stubLargura({ estreita: false })
})

afterEach(() => {
  window.matchMedia = originalMatchMedia
})

// ── US1: documento na tela ────────────────────────────────────────────────────

describe('PdfPreview — documento disponível', () => {
  it('renderiza o <object> com a URL obtida e o tipo correto', async () => {
    mockApi.get.mockResolvedValue({ data: { url: URL_DO_ARQUIVO, expiresInSeconds: 3600 } })

    renderPreview()

    await waitFor(() => expect(objetoDoDocumento()).not.toBeNull())
    expect(objetoDoDocumento()).toHaveAttribute('data', URL_DO_ARQUIVO)
    expect(objetoDoDocumento()).toHaveAttribute('type', 'application/pdf')
  })

  it('dá ao documento um rótulo acessível com o título do material', async () => {
    mockApi.get.mockResolvedValue({ data: { url: URL_DO_ARQUIVO, expiresInSeconds: 3600 } })

    renderPreview()

    await waitFor(() => expect(objetoDoDocumento()).not.toBeNull())
    expect(objetoDoDocumento()).toHaveAttribute('aria-label', 'Pré-visualização de Guia de Geometria')
  })
})

describe('PdfPreview — carregamento', () => {
  it('mostra progresso enquanto a URL não chega', async () => {
    // Promessa que não resolve: mantém o estado de carregamento.
    mockApi.get.mockReturnValue(new Promise(() => {}))

    renderPreview()

    expect(await screen.findByText(/Carregando documento/i)).toBeInTheDocument()
    expect(objetoDoDocumento()).toBeNull()
  })
})

// ── US2: estados de falha ─────────────────────────────────────────────────────

describe('PdfPreview — falha por permissão', () => {
  it.each([401, 403, 404])('com %i, avisa SEM oferecer nova tentativa', async (status) => {
    mockApi.get.mockRejectedValue({ response: { status } })

    renderPreview()

    expect(await screen.findByText(/Documento indisponível/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Tentar novamente/i })).not.toBeInTheDocument()
    expect(objetoDoDocumento()).toBeNull()
  })
})

describe('PdfPreview — falha temporária', () => {
  it('com 500, avisa e oferece nova tentativa', async () => {
    mockApi.get.mockRejectedValue({ response: { status: 500 } })

    renderPreview()

    expect(await screen.findByText(/Não foi possível carregar o documento/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Tentar novamente/i })).toBeInTheDocument()
  })

  it('com erro de rede (sem resposta), avisa e oferece nova tentativa', async () => {
    mockApi.get.mockRejectedValue(new Error('Network Error'))

    renderPreview()

    expect(await screen.findByText(/Não foi possível carregar o documento/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Tentar novamente/i })).toBeInTheDocument()
  })

  it('acionar "tentar novamente" refaz a busca da URL', async () => {
    const user = userEvent.setup()
    mockApi.get.mockRejectedValue({ response: { status: 500 } })

    renderPreview()
    await screen.findByRole('button', { name: /Tentar novamente/i })
    expect(mockApi.get).toHaveBeenCalledTimes(1)

    mockApi.get.mockResolvedValue({ data: { url: URL_DO_ARQUIVO, expiresInSeconds: 3600 } })
    await user.click(screen.getByRole('button', { name: /Tentar novamente/i }))

    await waitFor(() => expect(objetoDoDocumento()).not.toBeNull())
    expect(mockApi.get).toHaveBeenCalledTimes(2)
  })
})

// ── US3: tela estreita ────────────────────────────────────────────────────────

describe('PdfPreview — tela estreita', () => {
  beforeEach(() => {
    stubLargura({ estreita: true })
  })

  it('NÃO monta o documento e oferece a abertura em tela cheia', async () => {
    mockApi.get.mockResolvedValue({ data: { url: URL_DO_ARQUIVO, expiresInSeconds: 3600 } })

    renderPreview()

    expect(await screen.findByRole('button', { name: /Abrir documento/i })).toBeInTheDocument()
    expect(objetoDoDocumento()).toBeNull()
  })

  it('NÃO emite requisição da URL — o arquivo não deve ser baixado onde não será exibido', async () => {
    mockApi.get.mockResolvedValue({ data: { url: URL_DO_ARQUIVO, expiresInSeconds: 3600 } })

    renderPreview()

    await screen.findByRole('button', { name: /Abrir documento/i })
    expect(mockApi.get).not.toHaveBeenCalled()
  })

  it('a chamada de tela cheia aciona a ação recebida da tela', async () => {
    const user = userEvent.setup()
    const { onOpenFullscreen } = renderPreview()

    await user.click(await screen.findByRole('button', { name: /Abrir documento/i }))

    expect(onOpenFullscreen).toHaveBeenCalledTimes(1)
  })
})

describe('PdfPreview — tela larga', () => {
  it('volta a montar o documento', async () => {
    stubLargura({ estreita: false })
    mockApi.get.mockResolvedValue({ data: { url: URL_DO_ARQUIVO, expiresInSeconds: 3600 } })

    renderPreview()

    await waitFor(() => expect(objetoDoDocumento()).not.toBeNull())
    expect(mockApi.get).toHaveBeenCalled()
  })
})

describe('PdfPreview — sem título', () => {
  it('usa rótulo acessível genérico no documento', async () => {
    mockApi.get.mockResolvedValue({ data: { url: URL_DO_ARQUIVO, expiresInSeconds: 3600 } })

    renderWithProviders(
      <PdfPreview materialId="m1" materialStatus="APPROVED" onOpenFullscreen={vi.fn()} />,
    )

    await waitFor(() => expect(objetoDoDocumento()).not.toBeNull())
    expect(objetoDoDocumento()).toHaveAttribute('aria-label', 'Pré-visualização do documento')
  })

  it('em tela estreita, usa título genérico no cartão', async () => {
    stubLargura({ estreita: true })

    renderWithProviders(
      <PdfPreview materialId="m1" materialStatus="APPROVED" onOpenFullscreen={vi.fn()} />,
    )

    expect(await screen.findByText('Documento do material')).toBeInTheDocument()
  })
})
