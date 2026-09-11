// src/hooks/useIsNarrowScreen.ts
// Largura de tela, para decisões que precisam acontecer ANTES da montagem.
//
// Esconder um elemento por CSS o mantém no DOM — o navegador ainda baixa o que
// ele referencia. Quando a decisão é "não carregar", ela precisa vir daqui.
import { useEffect, useState } from 'react'

/** Abaixo disto, tela estreita. Alinhado ao breakpoint `md` do Tailwind. */
export const NARROW_SCREEN_QUERY = '(max-width: 767px)'

export function useIsNarrowScreen(): boolean {
  const [isNarrow, setIsNarrow] = useState(() => {
    // O jsdom não implementa matchMedia; os testes o substituem por dublê.
    if (typeof window.matchMedia !== 'function') return false
    return window.matchMedia(NARROW_SCREEN_QUERY).matches
  })

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return

    const mediaQuery = window.matchMedia(NARROW_SCREEN_QUERY)

    function handleChange(event: MediaQueryListEvent) {
      setIsNarrow(event.matches)
    }

    // Sincroniza caso a largura tenha mudado entre o estado inicial e o efeito.
    setIsNarrow(mediaQuery.matches)
    mediaQuery.addEventListener('change', handleChange)

    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return isNarrow
}
