// src/pages/AllMaterialsPage.tsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Library, FileText,
  ExternalLink, AlertCircle, RefreshCw, Loader2,
  Clock, CheckCircle2, XCircle, Trash2,
} from 'lucide-react'
import { AppShell } from '../components/AppShell'
import { HabilidadesBncc } from '../components/HabilidadesBncc'
import { useAuth } from '../context/AuthContext'
import { canManageMaterials } from '../lib/permissions'
import { useAllMaterials } from '../features/materials/hooks/useAllMaterials'
import { useDeleteMaterial } from '../features/materials/hooks/useDeleteMaterial'
import { getReviewPresignedUrlRequest } from '../features/materials/api/materialsApi'
import { getApiErrorMessage } from '../lib/apiError'
import type { MIStatus, PendingMaterial } from '../features/materials/api/materialsApi'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso))
}

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<MIStatus, { label: string; icon: React.ElementType; classes: string }> = {
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
      <Icon size={11} />{label}
    </span>
  )
}

// ── MaterialCard ──────────────────────────────────────────────────────────────

function MaterialCard({ material }: { material: PendingMaterial }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [isOpening, setIsOpening] = useState(false)
  const [viewError, setViewError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)

  const canDelete = canManageMaterials(user)
  const { mutate: deleteMaterial, isPending: isDeleting, error: deleteError } = useDeleteMaterial()

  async function handleView() {
    setIsOpening(true)
    setViewError(null)
    try {
      const { url } = await getReviewPresignedUrlRequest(material.id)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      setViewError(getApiErrorMessage(err))
    } finally {
      setIsOpening(false)
    }
  }

  function handleConfirmDelete() {
    deleteMaterial(material.id, { onSuccess: () => setConfirming(false) })
  }

  return (
    <div
      onClick={() => navigate(`/materials/${material.id}`)}
      className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 cursor-pointer
                 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-sm transition-all">
      <div className="flex items-start gap-4">

        {/* Ícone */}
        <div className="shrink-0 bg-indigo-50 dark:bg-indigo-950 rounded-xl p-3 mt-0.5">
          <FileText size={20} className="text-indigo-600 dark:text-indigo-400" />
        </div>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex flex-wrap items-start gap-2 justify-between">
            <Link
              to={`/materials/${material.id}`}
              className="font-semibold text-gray-900 dark:text-gray-100 text-sm
                         hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              {material.title}
            </Link>
            <StatusBadge status={material.status} />
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {material.originalFileName}
          </p>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400 dark:text-gray-500">
            <span>
              Por{' '}
              <span className="text-gray-600 dark:text-gray-300 font-medium">
                {material.uploadedBy.name}
              </span>
              {' '}·{' '}{material.uploadedBy.email}
            </span>
            <span>{formatBytes(material.sizeBytes)}</span>
            <span>{formatDate(material.createdAt)}</span>
          </div>

          {material.habilidadesBncc.length > 0 && <HabilidadesBncc habilidades={material.habilidadesBncc} />}

          {viewError && (
            <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
              <AlertCircle size={11} />{viewError}
            </p>
          )}
          {deleteError && (
            <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
              <AlertCircle size={11} />{getApiErrorMessage(deleteError)}
            </p>
          )}
        </div>

        {/* Ações */}
        <div className="shrink-0 flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); handleView() }}
            disabled={isOpening}
            aria-label={`Visualizar ${material.title}`}
            className="flex items-center gap-1.5 rounded-lg border border-indigo-200 dark:border-indigo-700
                       bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400
                       hover:bg-indigo-100 dark:hover:bg-indigo-900 disabled:opacity-50
                       px-3 py-1.5 text-xs font-medium transition-colors
                       focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
          >
            {isOpening ? <Loader2 size={13} className="animate-spin" /> : <ExternalLink size={13} />}
            <span className="hidden sm:inline">{isOpening ? 'Abrindo…' : 'Visualizar'}</span>
          </button>

          {/* Excluir (soft delete) — apenas PROFESSOR/ADMIN */}
          {canDelete && (
            confirming ? (
              <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-1.5">
                <span className="hidden sm:inline text-xs text-gray-500 dark:text-gray-400">Excluir?</span>
                <button
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  aria-label={`Confirmar exclusão de ${material.title}`}
                  className="flex items-center gap-1 rounded-lg bg-red-600 text-white hover:bg-red-700
                             disabled:opacity-50 px-2.5 py-1.5 text-xs font-medium transition-colors"
                >
                  {isDeleting ? <Loader2 size={13} className="animate-spin" /> : 'Sim'}
                </button>
                <button
                  onClick={() => setConfirming(false)}
                  disabled={isDeleting}
                  className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800
                             text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700
                             px-2.5 py-1.5 text-xs font-medium transition-colors"
                >
                  Não
                </button>
              </div>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); setConfirming(true) }}
                aria-label={`Excluir ${material.title}`}
                className="flex items-center gap-1.5 rounded-lg border border-red-200 dark:border-red-800
                           bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400
                           hover:bg-red-100 dark:hover:bg-red-900 px-3 py-1.5 text-xs font-medium transition-colors
                           focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
              >
                <Trash2 size={13} />
                <span className="hidden sm:inline">Excluir</span>
              </button>
            )
          )}
        </div>
      </div>
    </div>
  )
}

// ── AllMaterialsPage ──────────────────────────────────────────────────────────

const STATUS_TABS: { label: string; value: MIStatus | undefined }[] = [
  { label: 'Todos',           value: undefined },
  { label: 'Pendentes',       value: 'PENDING_REVIEW' },
  { label: 'Aprovados',       value: 'APPROVED' },
  { label: 'Rejeitados',      value: 'REJECTED' },
]

export function AllMaterialsPage() {
  const [statusFilter, setStatusFilter] = useState<MIStatus | undefined>(undefined)
  const [page, setPage] = useState(1)

  const { data, isLoading, isError, error, refetch } = useAllMaterials(statusFilter, page)

  function handleTabChange(value: MIStatus | undefined) {
    setStatusFilter(value)
    setPage(1)
  }

  const materials  = data?.materials ?? []
  const total      = data?.total     ?? 0
  const totalPages = Math.ceil(total / 25)

  return (
    <AppShell>
        <div className="max-w-5xl mx-auto space-y-6">

          {/* Cabeçalho */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Library size={20} className="text-indigo-600 dark:text-indigo-400" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Todos os Materiais
              </h1>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Visão geral de todos os materiais instrucionais enviados à plataforma.
            </p>
          </div>

          {/* Tabs de status */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 w-fit flex-wrap">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.label}
                onClick={() => handleTabChange(tab.value)}
                className={[
                  'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors focus:outline-none',
                  statusFilter === tab.value
                    ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
                ].join(' ')}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={28} className="animate-spin text-indigo-500" />
            </div>
          )}

          {/* Erro */}
          {isError && (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <div className="rounded-full bg-red-50 dark:bg-red-950 p-4">
                <AlertCircle size={28} className="text-red-500 dark:text-red-400" />
              </div>
              <div className="space-y-1">
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  Não foi possível carregar os materiais
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{getApiErrorMessage(error)}</p>
              </div>
              <button
                onClick={() => refetch()}
                className="flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600
                           bg-white dark:bg-gray-800 px-4 py-2 text-sm text-gray-700 dark:text-gray-300
                           hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <RefreshCw size={14} /> Tentar novamente
              </button>
            </div>
          )}

          {/* Lista */}
          {!isLoading && !isError && (
            <div className="space-y-4">

              {/* Contador + paginação */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {total === 0
                    ? 'Nenhum material encontrado'
                    : `${total} ${total === 1 ? 'material' : 'materiais'} — página ${page} de ${Math.max(1, totalPages)}`}
                </p>

                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800
                                 text-gray-700 dark:text-gray-300 px-3 py-1 text-xs disabled:opacity-40 transition-colors
                                 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      Anterior
                    </button>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {page}/{totalPages}
                    </span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800
                                 text-gray-700 dark:text-gray-300 px-3 py-1 text-xs disabled:opacity-40 transition-colors
                                 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      Próxima
                    </button>
                  </div>
                )}
              </div>

              {/* Vazio */}
              {materials.length === 0 ? (
                <div className="flex flex-col items-center gap-4 py-16 text-center">
                  <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-5">
                    <FileText size={32} className="text-gray-400 dark:text-gray-500" />
                  </div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    Nenhum material encontrado
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {materials.map(m => <MaterialCard key={m.id} material={m} />)}
                </div>
              )}
            </div>
          )}

          <p className="text-center text-xs text-gray-400 dark:text-gray-500">
            Campus IV · UFPB — Rio Tinto / Mamanguape
          </p>
        </div>
    </AppShell>
  )
}
