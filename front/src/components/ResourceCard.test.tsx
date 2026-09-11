// src/components/ResourceCard.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ResourceCard } from './ResourceCard'

// Mock do useNavigate para capturar a navegação sem montar rotas reais.
const navigateMock = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => navigateMock }
})

function renderCard(props: Partial<React.ComponentProps<typeof ResourceCard>> = {}) {
  return render(
    <MemoryRouter>
      <ResourceCard id="m1" title="Material X" detailTo="/materiais/m1" {...props} />
    </MemoryRouter>,
  )
}

describe('ResourceCard', () => {
  beforeEach(() => {
    navigateMock.mockReset()
  })

  it('exibe o título e o autor', () => {
    renderCard({ authorName: 'Prof. Ana' })
    expect(screen.getByText('Material X')).toBeInTheDocument()
    expect(screen.getByText('Prof. Ana')).toBeInTheDocument()
  })

  it('navega para a tela de detalhe ao clicar no card', async () => {
    const user = userEvent.setup()
    renderCard()
    await user.click(screen.getByRole('button', { name: /Ver detalhes de Material X/i }))
    expect(navigateMock).toHaveBeenCalledWith('/materiais/m1')
  })

  it('navega ao pressionar Enter (acessibilidade por teclado)', async () => {
    const user = userEvent.setup()
    renderCard()
    screen.getByRole('button', { name: /Ver detalhes/i }).focus()
    await user.keyboard('{Enter}')
    expect(navigateMock).toHaveBeenCalledWith('/materiais/m1')
  })

  it('exibe o selo de status quando informado', () => {
    renderCard({ status: 'APPROVED' })
    expect(screen.getByText('Aprovado')).toBeInTheDocument()
  })

  it('formata tamanho em KB e MB', () => {
    const { rerender } = renderCard({ sizeBytes: 512 * 1024 })
    expect(screen.getByText('512 KB')).toBeInTheDocument()

    rerender(
      <MemoryRouter>
        <ResourceCard id="m1" title="Material X" detailTo="/materiais/m1" sizeBytes={3 * 1024 * 1024} />
      </MemoryRouter>,
    )
    expect(screen.getByText('3.0 MB')).toBeInTheDocument()
  })

  it('exibe o nome da organização quando informado', () => {
    renderCard({ organizationName: 'Projeto Alpha' })
    expect(screen.getByText('Projeto Alpha')).toBeInTheDocument()
  })

  it('renderiza o botão de IA e dispara onChat sem navegar', async () => {
    const user = userEvent.setup()
    const onChat = vi.fn()
    renderCard({ onChat })
    await user.click(screen.getByRole('button', { name: /Conversar com IA/i }))
    expect(onChat).toHaveBeenCalledTimes(1)
    expect(navigateMock).not.toHaveBeenCalled()
  })
})
