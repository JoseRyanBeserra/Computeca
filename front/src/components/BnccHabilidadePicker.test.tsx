// src/components/BnccHabilidadePicker.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BnccHabilidadePicker } from './BnccHabilidadePicker'

// Wrapper controlado para exercitar o fluxo real de seleção
function Harness({ onAddSpy }: { onAddSpy?: (v: string) => void }) {
  const [selected, setSelected] = useState<string[]>([])
  return (
    <BnccHabilidadePicker
      selected={selected}
      onAdd={(v) => { onAddSpy?.(v); setSelected((p) => (p.includes(v) ? p : [...p, v])) }}
      onRemove={(v) => setSelected((p) => p.filter((h) => h !== v))}
    />
  )
}

describe('BnccHabilidadePicker', () => {
  it('filtra sugestões da BNCC por trecho da descrição', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.type(screen.getByLabelText(/Buscar habilidade BNCC/i), 'inteligência artificial')
    // EM13CO10 trata de Inteligência Artificial
    expect(await screen.findByRole('option', { name: /EM13CO10/i })).toBeInTheDocument()
  })

  it('oferece adicionar personalizada para texto fora da lista, mas não para código conhecido', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const input = screen.getByLabelText(/Buscar habilidade BNCC/i)

    await user.type(input, 'ABC-123')
    expect(await screen.findByRole('button', { name: /Adicionar habilidade personalizada/i })).toBeInTheDocument()

    await user.clear(input)
    await user.type(input, 'EF01CO01')
    expect(screen.queryByRole('button', { name: /Adicionar habilidade personalizada/i })).not.toBeInTheDocument()
    expect(await screen.findByRole('option', { name: /EF01CO01/i })).toBeInTheDocument()
  })

  it('adiciona a habilidade selecionada e a remove das sugestões', async () => {
    const onAddSpy = vi.fn()
    const user = userEvent.setup()
    render(<Harness onAddSpy={onAddSpy} />)

    await user.type(screen.getByLabelText(/Buscar habilidade BNCC/i), 'EF01CO01')
    await user.click(await screen.findByRole('option', { name: /EF01CO01/i }))

    expect(onAddSpy).toHaveBeenCalledWith('EF01CO01')
    expect(screen.getByRole('button', { name: /Remover EF01CO01/i })).toBeInTheDocument()
  })
})
