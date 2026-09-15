// src/components/chipStyles.ts
//
// Estilo do "chip" — a pílula que exibe habilidades BNCC e links relacionados.
//
// Vive num lugar só DE PROPÓSITO: o botão de link precisa ter a mesma aparência
// do chip de habilidade. Copiar as classes de um componente para o outro garante
// que eles divirjam no dia em que alguém ajustar uma cor ou um arredondamento.
// Consuma daqui; nunca copie as classes para um componente novo.
//
// As classes aparecem por extenso (sem interpolação) para o Tailwind encontrá-las.

/** Forma e peso, idênticos em toda matiz. */
const CHIP_BASE = 'inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium'

const CHIP_HUES = {
  /** Habilidade BNCC — informativa, não clicável. */
  indigo:
    'border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300',
  /** Contador "+N" das habilidades ocultas. */
  gray:
    'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400',
  /** Link relacionado — matiz própria, para o leitor distinguir o que é clicável. */
  teal:
    'border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 ' +
    'hover:bg-teal-100 dark:hover:bg-teal-900 transition-colors',
} as const

export type ChipHue = keyof typeof CHIP_HUES

export function chipClasses(hue: ChipHue): string {
  return `${CHIP_BASE} ${CHIP_HUES[hue]}`
}
