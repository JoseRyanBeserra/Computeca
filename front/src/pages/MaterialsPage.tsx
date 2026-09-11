// src/pages/MaterialsPage.tsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  FileText,
  UploadCloud,
  ExternalLink,
  Loader2,
  AlertCircle,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { AppShell } from '../components/AppShell'
import { HabilidadesBncc } from '../components/HabilidadesBncc'
import { useMyMaterials } from '../features/materials/hooks/useMyMaterials'
import { getMaterialPresignedUrlRequest } from '../features/materials/api/materialsApi'
import { getApiErrorMessage } from '../lib/apiError'
import type { MIStatus, UploadedMI } from '../features/materials/api/materialsApi'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day:    '2-digit',
    month:  '2-digit',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  MIStatus,
  { label: string; icon: React.ElementType; classes: string }
> = {
  PENDING_REVIEW: {
    label:   'Aguardando revisão',
    icon:    Clock,
    classes: 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  },
  APPROVED: {
    label:   'Aprovado',
    icon:    CheckCircle2,
    classes: 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
  },
  REJECTED: {
    label:   'Rejeitado',
    icon:    XCircle,
    classes: 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
  },
}

function StatusBadge({ status }: { status: MIStatus }) {
  const { label, icon: Icon, classes } = STATUS_CONFIG[status]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${classes}`}>
      <Icon size={11} />
      {label}
    </span>
  )
}

// ── MaterialCard ──────────────────────────────────────────────────────────────

interface MaterialCardProps {
  material: UploadedMI
}

function MaterialCard({ material }: MaterialCardProps) {
  const navigate = useNavigate()
  const [isOpening, setIsOpening] = useState(false)
  const [viewError, setViewError] = useState<string | null>(null)

  async function handleView() {
    setIsOpening(true)
    setViewError(null)
    try {
      const { url } = await getMaterialPresignedUrlRequest(material.id)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      setViewError(getApiErrorMessage(err))
    } finally {
      setIsOpening(false)
    }
  }

  return (
    <div
      onClick={() => navigate(`/materials/${material.id}`)}
      className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 cursor-pointer
                 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-sm transition-all">
      <div className="flex items-start gap-4">
        {/* Ícone */}
        <div className="shrink-0 bg-indigo-50 dark:bg-indigo-950 rounded-xl p-3 mt-0.5">
          <FileText size={20} className="text-indigo-600 dark:text-indigo-400" />
        </div>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Título + status */}
          <div className="flex flex-wrap items-start gap-2 justify-between">
            <Link
              to={`/materials/${material.id}`}
              className="font-semibold text-gray-900 dark:text-gray-100 text-sm leading-snug
                         hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              {material.title}
            </Link>
            <StatusBadge status={material.status} />
          </div>

          {/* Nome original do arquivo */}
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {material.originalFileName}
          </p>

          {/* Meta: tamanho + datas */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400 dark:text-gray-500">
            <span>{formatBytes(material.sizeBytes)}</span>
            <span>Enviado em {formatDate(material.createdAt)}</span>
            {material.updatedAt !== material.createdAt && (
              <span>Atualizado em {formatDate(material.updatedAt)}</span>
            )}
          </div>

          {/* Habilidades BNCC */}
          {material.habilidadesBncc.length > 0 && <HabilidadesBncc habilidades={material.habilidadesBncc} />}

          {/* Erro ao abrir */}
          {viewError && (
            <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
              <AlertCircle size={12} />
              {viewError}
            </p>
          )}
        </div>

        {/* Botão visualizar */}
        <button
          onClick={(e) => { e.stopPropagation(); handleView() }}
          disabled={isOpening}
          aria-label={`Visualizar ${material.title}`}
          className="shrink-0 flex items-center gap-1.5 rounded-lg border border-indigo-200 dark:border-indigo-700
                     bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400
                     hover:bg-indigo-100 dark:hover:bg-indigo-900
                     disabled:opacity-50 disabled:cursor-not-allowed
                     px-3 py-1.5 text-xs font-medium transition-colors
                     focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
        >
          {isOpening
            ? <Loader2 size={13} className="animate-spin" />
            : <ExternalLink size={13} />}
          <span className="hidden sm:inline">{isOpening ? 'Abrindo…' : 'Visualizar'}</span>
        </button>
      </div>
    </div>
  )
}

// ── MaterialsPage ─────────────────────────────────────────────────────────────

export function MaterialsPage() {
  const navigate = useNavigate()

  const { data: materials, isLoading, isError, error, refetch } = useMyMaterials()

  return (
    <AppShell>
        <div className="max-w-4xl mx-auto space-y-6">

          {/* Cabeçalho */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Meus Materiais</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Materiais instrucionais que você enviou à plataforma.
              </p>
            </div>

            <button
              onClick={() => navigate('/upload')}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white
                         hover:bg-indigo-700 transition-colors
                         focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-950"
            >
              <UploadCloud size={15} />
              Novo upload
            </button>
          </div>

          {/* Estado de carregamento */}
          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={28} className="animate-spin text-indigo-500" />
            </div>
          )}

          {/* Estado de erro */}
          {isError && (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <div className="rounded-full bg-red-50 dark:bg-red-950 p-4">
                <AlertCircle size={28} className="text-red-500 dark:text-red-400" />
              </div>
              <div className="space-y-1">
                <p className="font-medium text-gray-900 dark:text-gray-100">Não foi possível carregar os materiais</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{getApiErrorMessage(error)}</p>
              </div>
              <button
                onClick={() => refetch()}
                className="flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600
                           bg-white dark:bg-gray-800 px-4 py-2 text-sm text-gray-700 dark:text-gray-300
                           hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <RefreshCw size={14} />
                Tentar novamente
              </button>
            </div>
          )}

          {/* Estado vazio */}
          {!isLoading && !isError && materials?.length === 0 && (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-5">
                <FileText size={32} className="text-gray-400 dark:text-gray-500" />
              </div>
              <div className="space-y-1">
                <p className="font-medium text-gray-900 dark:text-gray-100">Nenhum material enviado ainda</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Envie seu primeiro material instrucional para a plataforma.
                </p>
              </div>
              <button
                onClick={() => navigate('/upload')}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white
                           hover:bg-indigo-700 transition-colors
                           focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-950"
              >
                <UploadCloud size={15} />
                Fazer upload
              </button>
            </div>
          )}

          {/* Lista de materiais */}
          {!isLoading && !isError && materials && materials.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {materials.length} {materials.length === 1 ? 'material encontrado' : 'materiais encontrados'}
              </p>
              {materials.map((material) => (
                <MaterialCard key={material.id} material={material} />
              ))}
            </div>
          )}

          <p className="text-center text-xs text-gray-400 dark:text-gray-500">
            Campus IV · UFPB — Rio Tinto / Mamanguape
          </p>
        </div>
    </AppShell>
  )
}
