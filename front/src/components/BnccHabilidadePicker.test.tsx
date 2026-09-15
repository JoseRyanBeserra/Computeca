// src/components/BnccHabilidadePicker.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BnccHabilidadePicker } from './BnccHabilidadePicker'
import {
  BNCC_COMPUTACAO,
  BNCC_COMPUTACAO_FLAT,
  BNCC_COMPUTACAO_MAP,
} from '../features/materials/data/bnccComputacao'

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

  // ── Feature 006: catálogo completo da BNCC Computação ──────────────────────

  const campoDeBusca = () => screen.getByLabelText(/Buscar habilidade BNCC/i)

  describe('lista completa (US1)', () => {
    // FR-014 / SC-006 — o autor vê TODAS as habilidades, e não apenas algumas.
    it('sem digitar, a lista traz as 141 habilidades — nenhuma etapa cortada', async () => {
      const user = userEvent.setup()
      render(<Harness />)

      await user.click(campoDeBusca())

      expect(await screen.findAllByRole('option')).toHaveLength(141)
      expect(BNCC_COMPUTACAO_FLAT).toHaveLength(141)
    })

    it('busca ampla traz todas as correspondências, sem corte por etapa', async () => {
      const user = userEvent.setup()
      render(<Harness />)

      await user.type(campoDeBusca(), 'problema')

      const casa = (h: { codigo: string; descricao: string }) =>
        h.codigo.toLowerCase().includes('problema') || h.descricao.toLowerCase().includes('problema')
      // Garante que o caso exercita o limite antigo de 8 por etapa: sem esta
      // condição o teste poderia passar mesmo com o corte de volta.
      expect(Math.max(...BNCC_COMPUTACAO.map((g) => g.habilidades.filter(casa).length))).toBeGreaterThan(8)
      expect(await screen.findAllByRole('option')).toHaveLength(BNCC_COMPUTACAO_FLAT.filter(casa).length)
    })

    it.each(['EI03CO07', 'EF15CO05', 'EF69CO10'])('encontra %s, de uma das etapas acrescentadas', async (codigo) => {
      const user = userEvent.setup()
      render(<Harness />)

      await user.type(campoDeBusca(), codigo)

      expect(await screen.findByRole('option', { name: new RegExp(codigo) })).toBeInTheDocument()
    })

    it.each([
      ['robótica', 'EM13CO16'],
      ['padrão de repetição', 'EI03CO01'],
    ])('busca pelo trecho "%s", só presente no texto integral, encontra %s', async (trecho, codigo) => {
      const user = userEvent.setup()
      render(<Harness />)

      await user.type(campoDeBusca(), trecho)

      expect(await screen.findByRole('option', { name: new RegExp(codigo) })).toBeInTheDocument()
    })

    it('exibe a descrição inteira, sem corte (EF02CO02, a mais longa)', async () => {
      const user = userEvent.setup()
      render(<Harness />)

      await user.type(campoDeBusca(), 'EF02CO02')

      const opcao = await screen.findByRole('option', { name: /EF02CO02/ })
      expect(opcao).toHaveTextContent(BNCC_COMPUTACAO_MAP.EF02CO02)
      expect(opcao).toHaveTextContent(/impacta na execução do algoritmo\.$/)
    })
  })

  describe('habilidades já gravadas (US2)', () => {
    it('código antes personalizado e agora oficial exibe a descrição oficial', () => {
      render(<BnccHabilidadePicker selected={['EI03CO01']} onAdd={vi.fn()} onRemove={vi.fn()} />)

      const tag = screen.getByText('EI03CO01', { selector: 'span' })
      expect(tag).toHaveAttribute('title', BNCC_COMPUTACAO_MAP.EI03CO01)
      expect(tag).not.toHaveAttribute('title', 'Habilidade personalizada')
    })

    it('código oficial não é oferecido como personalizado; texto fora do catálogo continua sendo', async () => {
      const user = userEvent.setup()
      render(<Harness />)

      await user.type(campoDeBusca(), 'EI03CO01')
      expect(await screen.findByRole('option', { name: /EI03CO01/ })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Adicionar habilidade personalizada/i })).not.toBeInTheDocument()

      await user.clear(campoDeBusca())
      await user.type(campoDeBusca(), 'MINHA-HAB-01')
      expect(await screen.findByRole('button', { name: /Adicionar habilidade personalizada/i })).toBeInTheDocument()
    })
  })

  describe('etapas (US3)', () => {
    it('sem digitar, as etapas aparecem na ordem da escolaridade', async () => {
      const user = userEvent.setup()
      render(<Harness />)

      await user.click(campoDeBusca())

      const rotulos = BNCC_COMPUTACAO.map((g) => screen.getByText(g.etapa))
      for (let i = 1; i < rotulos.length; i++) {
        expect(rotulos[i - 1].compareDocumentPosition(rotulos[i]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
      }
    })
  })
})
