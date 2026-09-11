// src/components/ResourceCard.tsx
// Card de material no estilo MEC RED: miniatura quadrada + título + autor + meta.
// O card inteiro navega para a tela de detalhe ao ser clicado.
// A miniatura usa um placeholder gerado por gradiente; quando o back-end fornecer
// uma URL de thumbnail (`thumbnailUrl`), ela é exibida automaticamente.
import { useNavigate } from 'react-router-dom'
import { FileText, ArrowRight, CheckCircle2, Clock, XCircle, Building2, MessageSquare } from 'lucide-react'
import { HabilidadesBncc } from './HabilidadesBncc'
import type { MIStatus } from '../features/materials/api/materialsApi'

// Gradientes para os placeholders de miniatura — escolhidos de forma estável por título.
const THUMB_GRADIENTS = [
  'linear-gradient(135deg, #16bcc6 0%, #2f80ed 100%)',
  'linear-gradient(135deg, #6366f1 0%, #16bcc6 100%)',
  'linear-gradient(135deg, #f6a623 0%, #f25c54 100%)',
  'linear-gradient(135deg, #0ea5b0 0%, #135a62 100%)',
  'linear-gradient(135deg, #2f80ed 0%, #6d28d9 100%)',
  'linear-gradient(135deg, #f25c54 0%, #b91c1c 100%)',
]

function gradientFor(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0
  return THUMB_GRADIENTS[Math.abs(hash) % THUMB_GRADIENTS.length]
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso))
}

const STATUS_BADGE: Record<MIStatus, { label: string; icon: typeof Clock; classes: string }> = {
  PENDING_REVIEW: { label: 'Pendente',  icon: Clock,        classes: 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800' },
  APPROVED:       { label: 'Aprovado',  icon: CheckCircle2, classes: 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800' },
  REJECTED:       { label: 'Rejeitado', icon: XCircle,      classes: 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800' },
}

export interface ResourceCardProps {
  id: string
  title: string
  /** Nome de quem enviou (opcional) */
  authorName?: string
  sizeBytes?: number
  createdAt?: string
  status?: MIStatus
  /** Habilidades BNCC associadas ao material */
  habilidades?: string[]
  /** Nome da organização/projeto ao qual este material pertence */
  organizationName?: string
  /** Rota da tela de detalhe — o card inteiro navega para cá ao ser clicado */
  detailTo: string
  /** URL de miniatura quando disponível via back-end */
  thumbnailUrl?: string
  /** Navega para o chat de IA sobre este material (opcional) */
  onChat?: () => void
}

export function ResourceCard({
  id, title, authorName, sizeBytes, createdAt, status, habilidades, organizationName, detailTo, thumbnailUrl, onChat,
}: ResourceCardProps) {
  const navigate = useNavigate()
  const statusInfo = status ? STATUS_BADGE[status] : null

  return (
    <div
      onClick={() => navigate(detailTo)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(detailTo) } }}
      aria-label={`Ver detalhes de ${title}`}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800
                 bg-white dark:bg-gray-900 transition-all hover:-translate-y-0.5 hover:shadow-lg
                 hover:border-indigo-300 dark:hover:border-indigo-700
                 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
    >
      {/* Miniatura */}
      <div
        className="relative block aspect-[4/3] w-full overflow-hidden"
        style={thumbnailUrl ? undefined : { background: gradientFor(id || title) }}
      >
        {thumbnailUrl ? (
          <img src={thumbnailUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center">
            <FileText size={44} className="text-white/85" />
          </span>
        )}

        {/* Selo de status (quando informado) */}
        {statusInfo && (
          <span className={`absolute left-2 top-2 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusInfo.classes}`}>
            <statusInfo.icon size={10} />
            {statusInfo.label}
          </span>
        )}

        {/* Overlay de detalhes no hover */}
        <span className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/25 transition-colors">
          <span className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1.5 rounded-full
                           bg-white/95 text-gray-800 px-3 py-1.5 text-xs font-semibold shadow">
            <ArrowRight size={13} />
            Ver detalhes
          </span>
        </span>
      </div>

      {/* Conteúdo */}
      <div className="flex flex-1 flex-col gap-2 p-3.5">
        <p className="line-clamp-2 text-sm font-semibold leading-snug text-gray-900 dark:text-gray-100
                      group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" title={title}>
          {title}
        </p>

        {organizationName && (
          <span className="inline-flex items-center gap-1 self-start rounded-full border border-indigo-200 dark:border-indigo-800
                           bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:text-indigo-300">
            <Building2 size={10} className="shrink-0" />
            <span className="truncate max-w-[140px]">{organizationName}</span>
          </span>
        )}

        {habilidades && habilidades.length > 0 && <HabilidadesBncc habilidades={habilidades} />}

        {authorName && (
          <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
            <CheckCircle2 size={13} className="shrink-0 text-indigo-500" />
            <span className="truncate">{authorName}</span>
          </div>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-gray-400 dark:text-gray-500">
          {sizeBytes != null && <span>{formatBytes(sizeBytes)}</span>}
          {sizeBytes != null && createdAt && <span aria-hidden>•</span>}
          {createdAt && <span>{formatDate(createdAt)}</span>}
        </div>

        {onChat && (
          <button
            onClick={(e) => { e.stopPropagation(); onChat() }}
            className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg
                       border border-indigo-200 dark:border-indigo-800 bg-indigo-50
                       dark:bg-indigo-950 py-1.5 text-xs font-semibold text-indigo-700
                       dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900
                       transition-colors"
          >
            <MessageSquare size={12} />
            Conversar com IA
          </button>
        )}
      </div>
    </div>
  )
}
