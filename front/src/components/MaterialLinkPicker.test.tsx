// src/components/MaterialLinkPicker.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { useState } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MaterialLinkPicker } from './MaterialLinkPicker'
import type { MaterialLink } from '../features/materials/api/materialsApi'

/** Monta o picker com estado real, como as telas fazem. */
function Harness({ inicial = [], onChange }: { inicial?: MaterialLink[]; onChange?: (l: MaterialLink[]) => void }) {
  const [links, setLinks] = useState<MaterialLink[]>(inicial)
  return (
    <MaterialLinkPicker
      links={links}
      onChange={(novos) => { setLinks(novos); onChange?.(novos) }}
    />
  )
}

function preencher(label: string, url: string) {
  fireEvent.change(screen.getByLabelText('Nome do link'), { target: { value: label } })
  fireEvent.change(screen.getByLabelText('Endereço do link'), { target: { value: url } })
}

const acrescentar = () => screen.getByRole('button', { name: /Acrescentar link/i })

describe('MaterialLinkPicker', () => {
  it('acrescentar um link válido o coloca na lista e esvazia os campos', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)

    preencher('  Videoaula  ', ' https://exemplo.org/aula ')
    await user.click(acrescentar())

    expect(onChange).toHaveBeenLastCalledWith([{ label: 'Videoaula', url: 'https://exemplo.org/aula' }])
    expect(screen.getByRole('button', { name: 'Remover link Videoaula' })).toBeInTheDocument()
    expect(screen.getByLabelText('Nome do link')).toHaveValue('')
    expect(screen.getByLabelText('Endereço do link')).toHaveValue('')
  })

  it('Enter num dos campos acrescenta o link sem enviar o formulário ao redor', () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault())
    render(
      <form onSubmit={onSubmit}>
        <Harness />
      </form>,
    )

    preencher('Artigo', 'https://exemplo.org/artigo')
    fireEvent.keyDown(screen.getByLabelText('Endereço do link'), { key: 'Enter' })

    expect(screen.getByRole('button', { name: 'Remover link Artigo' })).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('remover um link o tira da lista sem afetar os demais', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <Harness
        onChange={onChange}
        inicial={[
          { label: 'Videoaula', url: 'https://exemplo.org/aula' },
          { label: 'Planilha',  url: 'https://exemplo.org/planilha' },
          { label: 'Artigo',    url: 'https://exemplo.org/artigo' },
        ]}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Remover link Planilha' }))

    expect(onChange).toHaveBeenLastCalledWith([
      { label: 'Videoaula', url: 'https://exemplo.org/aula' },
      { label: 'Artigo',    url: 'https://exemplo.org/artigo' },
    ])
    expect(screen.queryByRole('button', { name: 'Remover link Planilha' })).not.toBeInTheDocument()
  })

  // FR-014 — as regras são informadas ao acrescentar, não ao enviar.
  describe('impede ao acrescentar, informando a regra', () => {
    it('rótulo vazio', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      render(<Harness onChange={onChange} />)

      preencher('   ', 'https://exemplo.org/aula')
      await user.click(acrescentar())

      expect(onChange).not.toHaveBeenCalled()
      expect(screen.getByRole('alert')).toHaveTextContent(/nome do link/i)
    })

    it.each(['exemplo.org', 'javascript:alert(1)', 'ftp://exemplo.org'])(
      'endereço malformado ou de protocolo não permitido: %s',
      async (url) => {
        const user = userEvent.setup()
        const onChange = vi.fn()
        render(<Harness onChange={onChange} />)

        preencher('Videoaula', url)
        await user.click(acrescentar())

        expect(onChange).not.toHaveBeenCalled()
        expect(screen.getByRole('alert')).toHaveTextContent(/http:\/\/ ou https:\/\//)
      },
    )

    it('o décimo primeiro link', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      const dez = Array.from({ length: 10 }, (_, i) => ({ label: `L${i}`, url: `https://exemplo.org/${i}` }))
      render(<Harness inicial={dez} onChange={onChange} />)

      expect(screen.getByText(/10 de 10 links/)).toBeInTheDocument()
      await user.click(acrescentar())

      expect(onChange).not.toHaveBeenCalled()
      expect(screen.getByRole('alert')).toHaveTextContent(/Limite de 10 links/)
    })
  })
})
