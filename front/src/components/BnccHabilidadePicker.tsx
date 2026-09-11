// src/components/BnccHabilidadePicker.tsx
// Seletor de habilidades da BNCC de Computação com busca + autocomplete:
// o usuário digita o código ou parte da descrição e recebe sugestões da lista
// oficial (Fundamental e Médio). Se a habilidade desejada não estiver na lista,
// é possível adicionar uma habilidade personalizada (texto livre).
import { useState, useRef, useEffect, useMemo } from 'react'
import { Search, X, GraduationCap, Plus } from 'lucide-react'
import { BNCC_COMPUTACAO, BNCC_COMPUTACAO_MAP, type BnccHabilidade } from '../features/materials/data/bnccComputacao'

interface BnccHabilidadePickerProps {
  /** Habilidades já selecionadas (códigos) */
  selected: string[]
  /** Adiciona uma habilidade (código da BNCC ou texto livre) */
  onAdd: (habilidade: string) => void
  /** Remove uma habilidade selecionada */
  onRemove: (habilidade: string) => void
  disabled?: boolean
  inputId?: string
}

interface GrupoFiltrado {
  etapa:       string
  habilidades: BnccHabilidade[]
}

const MAX_POR_GRUPO = 8

export function BnccHabilidadePicker({
  selected,
  onAdd,
  onRemove,
  disabled = false,
  inputId = 'bncc-habilidade',
}: BnccHabilidadePickerProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const q = query.trim()
  const qLower = q.toLowerCase()

  // Sugestões da BNCC que casam com a busca (código ou descrição) e ainda não selecionadas
  const grupos: GrupoFiltrado[] = useMemo(() => {
    return BNCC_COMPUTACAO
      .map((grupo) => ({
        etapa: grupo.etapa,
        habilidades: grupo.habilidades
          .filter((h) => !selected.includes(h.codigo))
          .filter((h) =>
            qLower
              ? h.codigo.toLowerCase().includes(qLower) || h.descricao.toLowerCase().includes(qLower)
              : true,
          )
          .slice(0, MAX_POR_GRUPO),
      }))
      .filter((grupo) => grupo.habilidades.length > 0)
  }, [selected, qLower])

  const totalSugestoes = grupos.reduce((acc, g) => acc + g.habilidades.length, 0)

  // Permite adicionar como personalizada quando o texto digitado não é um código já
  // conhecido/selecionado e não existe correspondência exata na lista.
  const custom = q.toUpperCase()
  const isKnownCode = custom in BNCC_COMPUTACAO_MAP
  const canAddCustom =
    q.length > 0 && !isKnownCode && !selected.includes(custom) && !selected.includes(q)

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function selecionar(codigo: string) {
    onAdd(codigo)
    setQuery('')
    setOpen(true) // mantém aberto para adicionar várias em sequência
  }

  function adicionarPersonalizada() {
    if (!canAddCustom) return
    onAdd(custom)
    setQuery('')
    setOpen(true)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      // Enter adiciona a primeira sugestão; se não houver, adiciona como personalizada
      const primeira = grupos[0]?.habilidades[0]
      if (primeira) selecionar(primeira.codigo)
      else if (canAddCustom) adicionarPersonalizada()
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="space-y-2">
      <div ref={containerRef} className="relative">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            id={inputId}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Busque por código ou descrição (ex.: EF06CO02, algoritmo)"
            aria-label="Buscar habilidade BNCC de Computação"
            autoComplete="off"
            disabled={disabled}
            className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800
                       pl-9 pr-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500
                       focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30
                       disabled:bg-gray-50 dark:disabled:bg-gray-900 disabled:cursor-not-allowed transition-colors"
          />
        </div>

        {/* Dropdown de sugestões (agrupadas por etapa) + opção personalizada */}
        {open && !disabled && (
          <div
            role="listbox"
            className="absolute z-20 mt-1 w-full max-h-72 overflow-auto rounded-xl border border-gray-200 dark:border-gray-700
                       bg-white dark:bg-gray-900 shadow-lg py-1"
          >
            {grupos.map((grupo) => (
              <div key={grupo.etapa}>
                <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                  {grupo.etapa}
                </p>
                {grupo.habilidades.map((h) => (
                  <button
                    key={h.codigo}
                    type="button"
                    role="option"
                    aria-selected={false}
                    onClick={() => selecionar(h.codigo)}
                    className="flex w-full items-start gap-2 px-3 py-2 text-left transition-colors
                               text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-950"
                  >
                    <GraduationCap size={13} className="mt-0.5 shrink-0 text-indigo-400" />
                    <span className="min-w-0">
                      <span className="font-medium text-indigo-700 dark:text-indigo-300">{h.codigo}</span>
                      <span className="block text-xs text-gray-500 dark:text-gray-400">{h.descricao}</span>
                    </span>
                  </button>
                ))}
              </div>
            ))}

            {/* Adicionar habilidade personalizada */}
            {canAddCustom && (
              <button
                type="button"
                onClick={adicionarPersonalizada}
                className="flex w-full items-center gap-2 border-t border-gray-100 dark:border-gray-800 px-3 py-2.5 text-left
                           text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <Plus size={14} className="shrink-0 text-indigo-500" />
                Adicionar habilidade personalizada: <span className="font-semibold">{custom}</span>
              </button>
            )}

            {totalSugestoes === 0 && !canAddCustom && (
              <p className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500">
                Nenhuma habilidade encontrada.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Habilidades selecionadas (tags removíveis) */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {selected.map((codigo) => (
            <span
              key={codigo}
              title={BNCC_COMPUTACAO_MAP[codigo] ?? 'Habilidade personalizada'}
              className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 dark:border-indigo-800
                         bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 pl-2.5 pr-1 py-0.5 text-xs font-medium"
            >
              {codigo}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => onRemove(codigo)}
                  aria-label={`Remover ${codigo}`}
                  className="rounded-full p-0.5 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors"
                >
                  <X size={12} />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400 dark:text-gray-500">
        Selecione da lista da BNCC de Computação ou digite uma habilidade própria e pressione Enter.
      </p>
    </div>
  )
}
