// src/pages/NotFoundPage.test.tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { NotFoundPage } from './NotFoundPage'
import { renderWithProviders } from '../test/utils'

describe('NotFoundPage', () => {
  beforeEach(() => localStorage.clear())

  it('renderiza 404 e link de retorno', () => {
    renderWithProviders(<NotFoundPage />)
    expect(screen.getByText('404')).toBeInTheDocument()
    expect(screen.getByText(/Página não encontrada/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Voltar ao início/i })).toHaveAttribute('href', '/')
  })
})
