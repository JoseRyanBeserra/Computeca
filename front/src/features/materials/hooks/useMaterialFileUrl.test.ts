// src/features/materials/hooks/useMaterialFileUrl.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.mock('../../../lib/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

import { api } from '../../../lib/api'
import { useMaterialFileUrl, RENEWAL_MARGIN_MS } from './useMaterialFileUrl'
import { setSession, makeUser } from '../../../test/utils'
import { AuthProvider } from '../../../context/AuthContext'

const mockApi = vi.mocked(api)

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return createElement(
    QueryClientProvider,
    { client: queryClient },
    createElement(AuthProvider, null, children),
  )
}

function respondWith(expiresInSeconds = 3600) {
  mockApi.get.mockResolvedValue({ data: { url: 'https://armazenamento/arquivo.pdf', expiresInSeconds } })
}

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

afterEach(() => {
  vi.useRealTimers()
})

// ── Escolha de rota (T008) ────────────────────────────────────────────────────

describe('useMaterialFileUrl — escolha de rota por perfil e situação', () => {
  it('PROFESSOR usa a rota de revisão', async () => {
    setSession(makeUser({ role: 'PROFESSOR' }))
    respondWith()

    renderHook(() => useMaterialFileUrl('m1', 'APPROVED'), { wrapper })

    await waitFor(() => expect(mockApi.get).toHaveBeenCalledWith('/mis/m1/review-presigned-url'))
  })

  it('ADMIN usa a rota de revisão', async () => {
    setSession(makeUser({ role: 'ADMIN', email: 'admin@dcx.ufpb.br' }))
    respondWith()

    renderHook(() => useMaterialFileUrl('m1', 'APPROVED'), { wrapper })

    await waitFor(() => expect(mockApi.get).toHaveBeenCalledWith('/mis/m1/review-presigned-url'))
  })

  it('COMMON com material APPROVED usa a rota pública', async () => {
    setSession(makeUser({ role: 'COMMON', email: 'ana@gmail.com' }))
    respondWith()

    renderHook(() => useMaterialFileUrl('m1', 'APPROVED'), { wrapper })

    await waitFor(() => expect(mockApi.get).toHaveBeenCalledWith('/mis/m1/public-presigned-url'))
  })

  it('COMMON com material PENDING_REVIEW usa a rota do autor', async () => {
    setSession(makeUser({ role: 'COMMON', email: 'ana@gmail.com' }))
    respondWith()

    renderHook(() => useMaterialFileUrl('m1', 'PENDING_REVIEW'), { wrapper })

    await waitFor(() => expect(mockApi.get).toHaveBeenCalledWith('/mis/m1/presigned-url'))
  })
})

// ── Desligamento (T010) ───────────────────────────────────────────────────────

describe('useMaterialFileUrl — enabled', () => {
  it('com enabled false, nenhuma requisição é emitida', async () => {
    setSession(makeUser({ role: 'PROFESSOR' }))
    respondWith()

    renderHook(() => useMaterialFileUrl('m1', 'APPROVED', false), { wrapper })

    await new Promise((r) => setTimeout(r, 20))
    expect(mockApi.get).not.toHaveBeenCalled()
  })

  it('sem materialId, nenhuma requisição é emitida', async () => {
    setSession(makeUser({ role: 'PROFESSOR' }))
    respondWith()

    renderHook(() => useMaterialFileUrl('', 'APPROVED'), { wrapper })

    await new Promise((r) => setTimeout(r, 20))
    expect(mockApi.get).not.toHaveBeenCalled()
  })
})

// ── Expiração e renovação (T009) ──────────────────────────────────────────────

describe('useMaterialFileUrl — renovação antes da expiração', () => {
  it('deriva o instante da expiração a partir de expiresInSeconds', async () => {
    setSession(makeUser({ role: 'PROFESSOR' }))
    respondWith(3600)

    const { result } = renderHook(() => useMaterialFileUrl('m1', 'APPROVED'), { wrapper })

    await waitFor(() => expect(result.current.url).toBeDefined())
    expect(result.current.expiresAt).toBeGreaterThan(Date.now())
    expect(result.current.expiresAt).toBeLessThanOrEqual(Date.now() + 3600 * 1000)
  })

  it('emite nova busca ao alcançar a janela de renovação, com a aba visível', async () => {
    setSession(makeUser({ role: 'PROFESSOR' }))
    respondWith(3600)

    // O relógio simulado precisa estar ativo ANTES da renderização: o efeito
    // agenda o setTimeout na montagem, e instalá-lo depois não assumiria o
    // controle de um temporizador já agendado com relógio real.
    // `shouldAdvanceTime` mantém as promessas do react-query progredindo.
    vi.useFakeTimers({ shouldAdvanceTime: true })

    const { result } = renderHook(() => useMaterialFileUrl('m1', 'APPROVED'), { wrapper })
    await waitFor(() => expect(result.current.url).toBeDefined())

    expect(mockApi.get).toHaveBeenCalledTimes(1)

    // Avança até a janela: validade menos a margem de 5 minutos.
    await act(async () => {
      vi.advanceTimersByTime(3600 * 1000 - RENEWAL_MARGIN_MS + 1000)
    })

    await waitFor(() => expect(mockApi.get).toHaveBeenCalledTimes(2))
  })

  it('com a aba oculta, NÃO emite a busca na janela de renovação', async () => {
    setSession(makeUser({ role: 'PROFESSOR' }))
    respondWith(3600)

    vi.useFakeTimers({ shouldAdvanceTime: true })

    const { result } = renderHook(() => useMaterialFileUrl('m1', 'APPROVED'), { wrapper })
    await waitFor(() => expect(result.current.url).toBeDefined())

    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')

    await act(async () => {
      vi.advanceTimersByTime(3600 * 1000 - RENEWAL_MARGIN_MS + 1000)
    })

    // Segue com uma única chamada: a renovação ficou pendente.
    expect(mockApi.get).toHaveBeenCalledTimes(1)

    visibility.mockRestore()
  })

  it('executa a renovação pendente quando o usuário retorna à aba', async () => {
    setSession(makeUser({ role: 'PROFESSOR' }))
    respondWith(3600)

    vi.useFakeTimers({ shouldAdvanceTime: true })

    const { result } = renderHook(() => useMaterialFileUrl('m1', 'APPROVED'), { wrapper })
    await waitFor(() => expect(result.current.url).toBeDefined())

    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')

    await act(async () => {
      vi.advanceTimersByTime(3600 * 1000 - RENEWAL_MARGIN_MS + 1000)
    })
    expect(mockApi.get).toHaveBeenCalledTimes(1)

    // O usuário volta para a aba.
    visibility.mockReturnValue('visible')
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })

    await waitFor(() => expect(mockApi.get).toHaveBeenCalledTimes(2))

    visibility.mockRestore()
  })
})

// ── Falha ─────────────────────────────────────────────────────────────────────

describe('useMaterialFileUrl — falha', () => {
  it('expõe o erro sem repetir automaticamente', async () => {
    setSession(makeUser({ role: 'PROFESSOR' }))
    mockApi.get.mockRejectedValue({ response: { status: 403 } })

    const { result } = renderHook(() => useMaterialFileUrl('m1', 'APPROVED'), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.url).toBeUndefined()
    expect(mockApi.get).toHaveBeenCalledTimes(1)
  })
})
