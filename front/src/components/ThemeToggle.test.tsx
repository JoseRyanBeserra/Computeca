// src/components/ThemeToggle.test.tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from '../context/ThemeContext'
import { ThemeToggle } from './ThemeToggle'

function renderToggle() {
  return render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>,
  )
}

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
  })

  it('mostra o rótulo "modo escuro" quando o tema é claro', () => {
    renderToggle()
    expect(screen.getByRole('button', { name: /Mudar para modo escuro/i })).toBeInTheDocument()
  })

  it('alterna o rótulo ao clicar', async () => {
    const user = userEvent.setup()
    renderToggle()
    await user.click(screen.getByRole('button'))
    expect(screen.getByRole('button', { name: /Mudar para modo claro/i })).toBeInTheDocument()
  })
})
