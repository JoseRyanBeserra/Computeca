// src/components/MaterialLinkPicker.tsx
// Acrescenta e remove links relacionados num formulário de material.
//
// As regras são conferidas AO ACRESCENTAR, não ao enviar (FR-014): quem cadastra
// conhece o formato antes de tentar, em vez de descobri-lo por uma recusa. É
// conveniência, não proteção — a proteção está no servidor, que recusa o mesmo.
import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { chipClasses } from './chipStyles'
import {
  RELATED_LINKS_MAX,
  RELATED_LINK_LABEL_MAX_LENGTH,
} from '../features/materials/constants'
import type { MaterialLink } from '../features/materials/api/materialsApi'

interface MaterialLinkPickerProps {
  links: MaterialLink[]
  onChange: (links: MaterialLink[]) => void
  disabled?: boolean
  /** Prefixo dos ids dos campos — permite dois pickers na mesma tela. */
  idPrefix?: string
}

/** Protocolo conferido pelo construtor de URL, como no servidor — nunca por prefixo. */
function enderecoPermitido(valor: string): boolean {
  try {
    const { protocol } = new URL(valor)
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}

export function MaterialLinkPicker({
  links,
  onChange,
  disabled = false,
  idPrefix = 'related-link',
}: MaterialLinkPickerProps) {
  const [label, setLabel] = useState('')
  const [url, setUrl] = useState('')
  const [erro, setErro] = useState('')

  const limiteAtingido = links.length >= RELATED_LINKS_MAX

  function acrescentar() {
    const rotulo = label.trim()
    const endereco = url.trim()

    if (limiteAtingido) {
      setErro(`Limite de ${RELATED_LINKS_MAX} links atingido. Remova um para acrescentar outro.`)
      return
    }
    if (!rotulo) {
      setErro('Informe o nome do link — é ele que aparece no botão.')
      return
    }
    if (rotulo.length > RELATED_LINK_LABEL_MAX_LENGTH) {
      setErro(`O nome do link deve ter no máximo ${RELATED_LINK_LABEL_MAX_LENGTH} caracteres.`)
      return
    }
    if (!enderecoPermitido(endereco)) {
      setErro('Informe o endereço completo, começando com http:// ou https://.')
      return
    }

    onChange([...links, { label: rotulo, url: endereco }])
    setLabel('')
    setUrl('')
    setErro('')
  }

  function remover(indice: number) {
    onChange(links.filter((_, i) => i !== indice))
    setErro('')
  }

  // Enter num destes campos acrescenta o link. Sem o preventDefault ele enviaria
  // o formulário do material inteiro.
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      acrescentar()
    }
  }

  const inputClasses =
    'w-full rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-2.5 text-sm ' +
    'text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 ' +
    'bg-white dark:bg-gray-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 ' +
    'disabled:bg-gray-50 dark:disabled:bg-gray-900 disabled:cursor-not-allowed transition-colors'

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)_auto] gap-2">
        <div>
          <label htmlFor={`${idPrefix}-label`} className="sr-only">Nome do link</label>
          <input
            id={`${idPrefix}-label`}
            type="text"
            value={label}
            onChange={(e) => { setLabel(e.target.value); setErro('') }}
            onKeyDown={handleKeyDown}
            placeholder="Nome (ex.: Videoaula)"
            maxLength={RELATED_LINK_LABEL_MAX_LENGTH}
            disabled={disabled || limiteAtingido}
            className={inputClasses}
          />
        </div>
        <div>
          <label htmlFor={`${idPrefix}-url`} className="sr-only">Endereço do link</label>
          <input
            id={`${idPrefix}-url`}
            // `text`, não `url`: um campo `url` com rascunho inválido bloquearia o
            // envio do formulário do material pela validação nativa do navegador.
            type="text"
            inputMode="url"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setErro('') }}
            onKeyDown={handleKeyDown}
            placeholder="https://…"
            disabled={disabled || limiteAtingido}
            className={inputClasses}
          />
        </div>
        <button
          type="button"
          onClick={acrescentar}
          disabled={disabled}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-teal-200 dark:border-teal-800
                     bg-teal-50 dark:bg-teal-950 px-4 py-2.5 text-sm font-medium text-teal-700 dark:text-teal-300
                     hover:bg-teal-100 dark:hover:bg-teal-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Plus size={15} />
          Acrescentar link
        </button>
      </div>

      {erro && (
        <p role="alert" className="text-xs text-amber-600 dark:text-amber-400">{erro}</p>
      )}

      {links.length > 0 && (
        <ul aria-label="Links acrescentados" className="flex flex-wrap gap-1.5 pt-1">
          {links.map((link, i) => (
            <li key={i} title={link.url} className={`${chipClasses('teal')} gap-1 pr-1`}>
              {link.label}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => remover(i)}
                  aria-label={`Remover link ${link.label}`}
                  className="rounded p-0.5 hover:bg-teal-200 dark:hover:bg-teal-800 transition-colors"
                >
                  <X size={11} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-gray-400 dark:text-gray-500">
        {links.length} de {RELATED_LINKS_MAX} links. O nome aparece no botão (até{' '}
        {RELATED_LINK_LABEL_MAX_LENGTH} caracteres); o endereço deve começar com http:// ou https://.
      </p>
    </div>
  )
}
