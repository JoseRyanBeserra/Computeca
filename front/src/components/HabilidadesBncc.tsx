// src/components/HabilidadesBncc.tsx
// Exibe as habilidades BNCC de um material como "chips".
// Em listagens, limite a quantidade com `max` (mostra "+N" para o restante);
// na tela de detalhe, passe `max={0}` para exibir todas.
import { GraduationCap } from 'lucide-react'

interface HabilidadesBnccProps {
  habilidades: string[]
  /** Máximo de chips visíveis; 0 = sem limite. Padrão: 3 */
  max?: number
  /** Exibe um rótulo "Habilidades BNCC" acima dos chips */
  withLabel?: boolean
}

export function HabilidadesBncc({ habilidades, max = 3, withLabel = false }: HabilidadesBnccProps) {
  if (!habilidades?.length) return null

  const shown = max > 0 ? habilidades.slice(0, max) : habilidades
  const rest = habilidades.length - shown.length

  return (
    <div className="space-y-1">
      {withLabel && (
        <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
          <GraduationCap size={13} className="text-indigo-500" />
          Habilidades BNCC
        </span>
      )}
      <div className="flex flex-wrap gap-1.5">
        {shown.map((habilidade) => (
          <span
            key={habilidade}
            className="inline-flex items-center rounded-md border border-indigo-200 dark:border-indigo-800
                       bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300
                       px-2 py-0.5 text-[11px] font-medium"
          >
            {habilidade}
          </span>
        ))}
        {rest > 0 && (
          <span
            className="inline-flex items-center rounded-md border border-gray-200 dark:border-gray-700
                       bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-0.5 text-[11px] font-medium"
            title={habilidades.slice(max).join(', ')}
          >
            +{rest}
          </span>
        )}
      </div>
    </div>
  )
}
