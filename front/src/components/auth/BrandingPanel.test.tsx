// src/components/auth/BrandingPanel.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrandingPanel } from './BrandingPanel'

describe('BrandingPanel', () => {
  it('renderiza a marca e a proposta de valor', () => {
    render(<BrandingPanel />)
    expect(screen.getByText('Computeca')).toBeInTheDocument()
    expect(screen.getByText(/Acervo acadêmico/i)).toBeInTheDocument()
    expect(screen.getByText(/Busca semântica por conteúdo/i)).toBeInTheDocument()
    expect(screen.getByText(/Campus IV · UFPB/i)).toBeInTheDocument()
  })
})
