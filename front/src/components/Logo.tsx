// src/components/Logo.tsx
// Logotipo da Computeca — marca gráfica (livro/código) + wordmark em duas cores.

interface LogoProps {
  /** Esconde o subtítulo (uso em barras compactas) */
  compact?: boolean
  className?: string
}

export function Logo({ compact = false, className = '' }: LogoProps) {
  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      <img
        src="/logo.png"
        alt=""
        aria-hidden
        className="h-11 w-11 shrink-0 object-contain"
      />
      <div className="leading-none">
        <div className="text-xl font-black tracking-tight" style={{ color: 'var(--color-brand-teal)' }}>
          Computeca
        </div>
        {!compact && (
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400 dark:text-gray-500">
            Acervo de MIs · UFPB
          </p>
        )}
      </div>
    </div>
  )
}
