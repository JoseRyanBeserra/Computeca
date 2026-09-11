// src/components/HabilidadeFilter.tsx
// Filtro de habilidades BNCC com busca + autocomplete:
// o usuário digita o código e recebe sugestões que completam a habilidade;
// ao selecionar, vira uma "tag" removível. Multisseleção + opção "sem habilidade".
import { useState, useRef, useEffect, useMemo } from 'react'
import { Search, X, GraduationCap } from 'lucide-react'

interface HabilidadeFilterProps {
  /** Todas as habilidades distintas do acervo */
  available: string[]
  /** Habilidades atualmente selecionadas */
  selected: string[]
  /** Inclui materiais sem nenhuma habilidade */
  semHabilidade: boolean
  /** Alterna (adiciona/remove) uma habilidade */
  onToggleHabilidade: (habilidade: string) => void
  /** Alterna o "sem habilidade" */
  onToggleSemHabilidade: () => void
  /** Limpa todos os filtros */
  onClear: () => void
}

const MAX_SUGGESTIONS = 8

export function HabilidadeFilter({
  available,
  selected,
  semHabilidade,
  onToggleHabilidade,
  onToggleSemHabilidade,
  onClear,
}: HabilidadeFilterProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const hasActiveFilters = selected.length > 0 || semHabilidade

  // Sugestões: habilidades disponíveis ainda não selecionadas que casam com o texto
  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase()
    return available
      .filter((h) => !selected.includes(h))
      .filter((h) => (q ? h.toLowerCase().includes(q) : true))
      .slice(0, MAX_SUGGESTIONS)
  }, [available, selected, query])

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Reseta o destaque ao mudar a busca/abrir
  useEffect(() => { setHighlight(0) }, [query, open])

  function selectSuggestion(habilidade: string) {
    onToggleHabilidade(habilidade)
    setQuery('')
    setOpen(true) // mantém aberto para adicionar várias em sequência
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setHighlight((i) => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const choice = suggestions[highlight]
      if (choice) selectSuggestion(choice)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-gray-200">
          <GraduationCap size={15} className="text-indigo-500" />
          Filtrar por habilidade BNCC
        </span>
        {hasActiveFilters && (
          <button
            onClick={onClear}
            className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            <X size={12} /> Limpar
          </button>
        )}
      </div>

      {/* Campo de busca com autocomplete */}
      <div ref={containerRef} className="relative">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Digite uma habilidade (ex.: EF15LP01)"
            aria-label="Buscar habilidade BNCC"
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800
                       pl-9 pr-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500
                       focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-colors"
          />
        </div>

        {/* Dropdown de sugestões */}
        {open && (
          <ul
            role="listbox"
            className="absolute z-20 mt-1 w-full max-h-60 overflow-auto rounded-lg border border-gray-200 dark:border-gray-700
                       bg-white dark:bg-gray-900 shadow-lg py-1"
          >
            {suggestions.length === 0 ? (
              <li className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500">
                {available.length === 0
                  ? 'Nenhuma habilidade cadastrada ainda.'
                  : 'Nenhuma habilidade encontrada.'}
              </li>
            ) : (
              suggestions.map((habilidade, i) => (
                <li key={habilidade} role="option" aria-selected={i === highlight}>
                  <button
                    type="button"
                    onMouseEnter={() => setHighlight(i)}
                    onClick={() => selectSuggestion(habilidade)}
                    className={[
                      'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors',
                      i === highlight
                        ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800',
                    ].join(' ')}
                  >
                    <GraduationCap size={13} className="shrink-0 text-indigo-400" />
                    {habilidade}
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      {/* Habilidades selecionadas (tags removíveis) */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((habilidade) => (
            <span
              key={habilidade}
              className="inline-flex items-center gap-1 rounded-full border border-indigo-200 dark:border-indigo-800
                         bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 pl-2.5 pr-1 py-0.5 text-xs font-medium"
            >
              {habilidade}
              <button
                onClick={() => onToggleHabilidade(habilidade)}
                aria-label={`Remover ${habilidade}`}
                className="rounded-full p-0.5 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Incluir materiais sem habilidade */}
      <label className="inline-flex items-center gap-2 cursor-pointer select-none text-sm text-gray-600 dark:text-gray-300">
        <input
          type="checkbox"
          checked={semHabilidade}
          onChange={onToggleSemHabilidade}
          className="h-4 w-4 rounded accent-indigo-600"
        />
        Incluir materiais <span className="font-medium">sem habilidade</span>
      </label>
    </div>
  )
}
