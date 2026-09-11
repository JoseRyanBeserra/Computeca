// src/components/HabilidadesBncc.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HabilidadesBncc } from './HabilidadesBncc'

describe('HabilidadesBncc', () => {
  it('não renderiza nada quando a lista está vazia', () => {
    const { container } = render(<HabilidadesBncc habilidades={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('exibe todas as habilidades quando estão abaixo do limite', () => {
    render(<HabilidadesBncc habilidades={['EF01', 'EF02']} />)
    expect(screen.getByText('EF01')).toBeInTheDocument()
    expect(screen.getByText('EF02')).toBeInTheDocument()
  })

  it('limita a quantidade e mostra "+N" para o restante (max padrão = 3)', () => {
    render(<HabilidadesBncc habilidades={['A', 'B', 'C', 'D', 'E']} />)
    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.getByText('C')).toBeInTheDocument()
    expect(screen.queryByText('D')).not.toBeInTheDocument()
    expect(screen.getByText('+2')).toBeInTheDocument()
  })

  it('exibe todas quando max = 0 (sem limite)', () => {
    render(<HabilidadesBncc habilidades={['A', 'B', 'C', 'D']} max={0} />)
    expect(screen.getByText('D')).toBeInTheDocument()
    expect(screen.queryByText(/^\+/)).not.toBeInTheDocument()
  })

  it('renderiza o rótulo quando withLabel é true', () => {
    render(<HabilidadesBncc habilidades={['A']} withLabel />)
    expect(screen.getByText('Habilidades BNCC')).toBeInTheDocument()
  })
})
