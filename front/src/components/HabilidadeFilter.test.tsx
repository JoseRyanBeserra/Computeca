// src/components/HabilidadeFilter.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HabilidadeFilter } from './HabilidadeFilter'

function setup(props: Partial<React.ComponentProps<typeof HabilidadeFilter>> = {}) {
  const onToggleHabilidade = vi.fn()
  const onToggleSemHabilidade = vi.fn()
  const onClear = vi.fn()
  render(
    <HabilidadeFilter
      available={['EF15LP01', 'EF15LP02', 'EF01MA03']}
      selected={[]}
      semHabilidade={false}
      onToggleHabilidade={onToggleHabilidade}
      onToggleSemHabilidade={onToggleSemHabilidade}
      onClear={onClear}
      {...props}
    />,
  )
  return { onToggleHabilidade, onToggleSemHabilidade, onClear }
}

beforeEach(() => vi.clearAllMocks())

describe('HabilidadeFilter', () => {
  it('filtra sugestões conforme a busca e seleciona ao clicar', async () => {
    const user = userEvent.setup()
    const { onToggleHabilidade } = setup()

    await user.type(screen.getByLabelText(/Buscar habilidade BNCC/i), 'EF15')
    // Só as EF15* aparecem
    expect(screen.getByRole('button', { name: /EF15LP01/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /EF01MA03/ })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /EF15LP01/ }))
    expect(onToggleHabilidade).toHaveBeenCalledWith('EF15LP01')
  })

  it('seleciona via teclado (ArrowDown + Enter)', async () => {
    const user = userEvent.setup()
    const { onToggleHabilidade } = setup()
    const input = screen.getByLabelText(/Buscar habilidade BNCC/i)
    await user.click(input)
    await user.keyboard('{ArrowDown}{Enter}')
    expect(onToggleHabilidade).toHaveBeenCalled()
  })

  it('renderiza tags selecionadas e permite remover', async () => {
    const user = userEvent.setup()
    const { onToggleHabilidade, onClear } = setup({ selected: ['EF15LP01'] })

    await user.click(screen.getByRole('button', { name: /Remover EF15LP01/i }))
    expect(onToggleHabilidade).toHaveBeenCalledWith('EF15LP01')

    await user.click(screen.getByRole('button', { name: /Limpar/i }))
    expect(onClear).toHaveBeenCalled()
  })

  it('alterna "incluir materiais sem habilidade"', async () => {
    const user = userEvent.setup()
    const { onToggleSemHabilidade } = setup()
    await user.click(screen.getByRole('checkbox'))
    expect(onToggleSemHabilidade).toHaveBeenCalled()
  })

  it('mostra mensagem quando não há habilidades cadastradas', async () => {
    const user = userEvent.setup()
    setup({ available: [] })
    await user.click(screen.getByLabelText(/Buscar habilidade BNCC/i))
    expect(screen.getByText(/Nenhuma habilidade cadastrada ainda/i)).toBeInTheDocument()
  })
})
