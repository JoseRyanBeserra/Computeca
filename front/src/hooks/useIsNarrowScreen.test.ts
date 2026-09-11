// src/hooks/useIsNarrowScreen.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useIsNarrowScreen, NARROW_SCREEN_QUERY } from './useIsNarrowScreen'

// O jsdom não implementa matchMedia — dublê controlável para simular a largura
// e disparar mudanças.
type Listener = (event: MediaQueryListEvent) => void

function stubMatchMedia(initialMatches: boolean) {
  const listeners = new Set<Listener>()
  let matches = initialMatches

  const mql = {
    get matches() {
      return matches
    },
    media: NARROW_SCREEN_QUERY,
    addEventListener: (_: string, listener: Listener) => { listeners.add(listener) },
    removeEventListener: (_: string, listener: Listener) => { listeners.delete(listener) },
  }

  window.matchMedia = vi.fn(() => mql) as unknown as typeof window.matchMedia

  return {
    mql,
    /** Simula o usuário redimensionando a janela. */
    change(next: boolean) {
      matches = next
      for (const listener of listeners) listener({ matches: next } as MediaQueryListEvent)
    },
    listenerCount: () => listeners.size,
  }
}

const originalMatchMedia = window.matchMedia

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  window.matchMedia = originalMatchMedia
})

describe('useIsNarrowScreen', () => {
  it('retorna true quando a largura está abaixo do corte', () => {
    stubMatchMedia(true)

    const { result } = renderHook(() => useIsNarrowScreen())

    expect(result.current).toBe(true)
  })

  it('retorna false quando a largura está a partir do corte', () => {
    stubMatchMedia(false)

    const { result } = renderHook(() => useIsNarrowScreen())

    expect(result.current).toBe(false)
  })

  it('consulta o corte de 768px', () => {
    stubMatchMedia(false)

    renderHook(() => useIsNarrowScreen())

    expect(window.matchMedia).toHaveBeenCalledWith('(max-width: 767px)')
  })

  it('reage à mudança de largura sem remontar', () => {
    const media = stubMatchMedia(false)

    const { result } = renderHook(() => useIsNarrowScreen())
    expect(result.current).toBe(false)

    act(() => media.change(true))
    expect(result.current).toBe(true)

    act(() => media.change(false))
    expect(result.current).toBe(false)
  })

  it('remove o listener na desmontagem', () => {
    const media = stubMatchMedia(false)

    const { unmount } = renderHook(() => useIsNarrowScreen())
    expect(media.listenerCount()).toBe(1)

    unmount()
    expect(media.listenerCount()).toBe(0)
  })

  it('não quebra quando matchMedia não existe no ambiente', () => {
    // @ts-expect-error — simula ambiente sem a API
    window.matchMedia = undefined

    const { result } = renderHook(() => useIsNarrowScreen())

    expect(result.current).toBe(false)
  })
})
