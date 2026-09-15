// src/components/MaterialLinks.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MaterialLinks } from './MaterialLinks'

const LINKS = [
  { label: 'Videoaula', url: 'https://exemplo.org/aula' },
  { label: 'Planilha',  url: 'https://exemplo.org/planilha.xlsx' },
]

describe('MaterialLinks', () => {
  it('renderiza um elemento acionável por link, exibindo o rótulo e nunca o endereço', () => {
    render(<MaterialLinks links={LINKS} />)

    const acionaveis = screen.getAllByRole('link')
    expect(acionaveis).toHaveLength(2)
    expect(acionaveis[0]).toHaveTextContent('Videoaula')
    expect(acionaveis[0]).toHaveAttribute('href', 'https://exemplo.org/aula')
    expect(screen.queryByText('https://exemplo.org/aula')).not.toBeInTheDocument()
  })

  it('preserva a ordem de cadastro', () => {
    render(<MaterialLinks links={LINKS} />)

    expect(screen.getAllByRole('link').map((a) => a.textContent)).toEqual(['Videoaula', 'Planilha'])
  })

  // FR-007 — sem links, nem rótulo de seção, nem contêiner.
  it('com lista vazia, nada é renderizado', () => {
    const { container } = render(<MaterialLinks links={[]} />)

    expect(container.firstChild).toBeNull()
    expect(screen.queryByText(/Links relacionados/i)).not.toBeInTheDocument()
  })

  // FR-005 — o destino é revelado antes do clique.
  it('expõe o endereço completo ao passar o cursor', () => {
    render(<MaterialLinks links={LINKS} />)

    expect(screen.getByRole('link', { name: /Planilha/ })).toHaveAttribute(
      'title',
      'https://exemplo.org/planilha.xlsx',
    )
  })

  // FR-006 e FR-015 — abre fora da tela e isola a origem do destino.
  it('abre em contexto separado, sem dar ao destino referência à origem nem a procedência', () => {
    render(<MaterialLinks links={LINKS} />)

    for (const link of screen.getAllByRole('link')) {
      expect(link).toHaveAttribute('target', '_blank')
      const rel = (link.getAttribute('rel') ?? '').split(/\s+/)
      expect(rel).toContain('noopener')
      expect(rel).toContain('noreferrer')
    }
  })
})
