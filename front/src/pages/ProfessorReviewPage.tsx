// src/pages/ProfessorReviewPage.tsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ClipboardCheck,
  FileText,
  ExternalLink,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Loader2,
  Check,
  X,
} from 'lucide-react'
import { AppShell } from '../components/AppShell'
import { HabilidadesBncc } from '../components/HabilidadesBncc'
import { usePendingMaterials } from '../features/materials/hooks/usePendingMaterials'
import { useReviewMaterial } from '../features/materials/hooks/useReviewMaterial'
import { getReviewPresignedUrlRequest } from '../features/materials/api/materialsApi'
import { getApiErrorMessage } from '../lib/apiError'
import type { PendingMaterial, ReviewDecision } from '../features/materials/api/materialsApi'

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

// ── MaterialReviewCard ────────────────────────────────────────────────────────

interface MaterialReviewCardProps { material: PendingMaterial }

function MaterialReviewCard({ material }: MaterialReviewCardProps) {
  const navigate = useNavigate()
  const [confirming, setConfirming] = useState<ReviewDecision | null>(null)
  const [isOpening, setIsOpening]   = useState(false)
  const [viewError, setViewError]   = useState<string | null>(null)
  const [decided, setDecided]       = useState<ReviewDecision | null>(null)

  const { mutate: review, isPending, error: reviewError, reset } = useReviewMaterial()

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

  function handleDecision(decision: ReviewDecision) {
    reset()
    setConfirming(decision)
  }

  function handleConfirm() {
    if (!confirming) return
    review(
      { materialId: material.id, decision: confirming },
      {
        onSuccess: () => {
          setDecided(confirming)
          setConfirming(null)
        },
      },
    )
  }

  return (
    <div
      onClick={() => navigate(`/materials/${material.id}`)}
      className={[
      'bg-white dark:bg-gray-900 rounded-xl border p-5 transition-colors cursor-pointer',
      decided === 'APPROVED' ? 'border-green-200 dark:border-green-800' :
      decided === 'REJECTED' ? 'border-red-200 dark:border-red-800'    :
      'border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700',
    ].join(' ')}>

      <div className="flex items-start gap-4">
        {/* Ícone */}
        <div className="shrink-0 bg-indigo-50 dark:bg-indigo-950 rounded-xl p-3 mt-0.5">
          <FileText size={20} className="text-indigo-600 dark:text-indigo-400" />
        </div>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0 space-y-2">
          <Link
            to={`/materials/${material.id}`}
            className="font-semibold text-gray-900 dark:text-gray-100 text-sm leading-snug
                       hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            {material.title}
          </Link>

          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {material.originalFileName}
          </p>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400 dark:text-gray-500">
            <span>
              Por <span className="text-gray-600 dark:text-gray-300 font-medium">{material.uploadedBy.name}</span>
              {' · '}{material.uploadedBy.email}
            </span>
            <span>{formatBytes(material.sizeBytes)}</span>
            <span>Enviado em {formatDate(material.createdAt)}</span>
          </div>

          {material.habilidadesBncc.length > 0 && <HabilidadesBncc habilidades={material.habilidadesBncc} />}

          {/* Erros */}
          {viewError && (
            <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
              <AlertCircle size={11} />{viewError}
            </p>
          )}
          {reviewError && (
            <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
              <AlertCircle size={11} />{getApiErrorMessage(reviewError)}
            </p>
          )}
        </div>

        {/* Ações — não disparam a navegação do card */}
        <div onClick={(e) => e.stopPropagation()} className="shrink-0 flex flex-col items-end gap-2 min-w-[140px]">

          {/* Resultado final */}
          {decided === 'APPROVED' && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 dark:text-green-400">
              <CheckCircle2 size={14} /> Aprovado
            </span>
          )}
          {decided === 'REJECTED' && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 dark:text-red-400">
              <XCircle size={14} /> Rejeitado
            </span>
          )}

          {/* Botões de ação */}
          {!decided && (
            <>
              {/* Visualizar PDF */}
              <button
                onClick={handleView}
                disabled={isOpening}
                className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700
                           bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300
                           hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50
                           px-3 py-1.5 text-xs font-medium transition-colors
                           focus:outline-none focus:ring-2 focus:ring-gray-400"
              >
                {isOpening ? <Loader2 size={12} className="animate-spin" /> : <ExternalLink size={12} />}
                {isOpening ? 'Abrindo…' : 'Visualizar PDF'}
              </button>

              {/* Confirmação inline */}
              {confirming ? (
                <div className="w-full space-y-1.5">
                  <p className="text-xs text-center text-gray-600 dark:text-gray-400 font-medium">
                    {confirming === 'APPROVED' ? 'Confirmar aprovação?' : 'Confirmar rejeição?'}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleConfirm}
                      disabled={isPending}
                      className={[
                        'flex-1 flex items-center justify-center gap-1 rounded-lg text-white px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-50',
                        confirming === 'APPROVED'
                          ? 'bg-green-600 hover:bg-green-700'
                          : 'bg-red-600 hover:bg-red-700',
                      ].join(' ')}
                    >
                      {isPending ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                      Sim
                    </button>
                    <button
                      onClick={() => setConfirming(null)}
                      disabled={isPending}
                      className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-gray-300 dark:border-gray-600
                                 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300
                                 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50
                                 px-2.5 py-1.5 text-xs font-medium transition-colors"
                    >
                      <X size={11} /> Não
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 w-full">
                  <button
                    onClick={() => handleDecision('APPROVED')}
                    className="flex-1 flex items-center justify-center gap-1 rounded-lg
                               bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800
                               text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900
                               px-2.5 py-1.5 text-xs font-medium transition-colors
                               focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <CheckCircle2 size={12} /> Aprovar
                  </button>
                  <button
                    onClick={() => handleDecision('REJECTED')}
                    className="flex-1 flex items-center justify-center gap-1 rounded-lg
                               bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800
                               text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900
                               px-2.5 py-1.5 text-xs font-medium transition-colors
                               focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <XCircle size={12} /> Rejeitar
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── ProfessorReviewPage ───────────────────────────────────────────────────────

export function ProfessorReviewPage() {
  const { data: materials, isLoading, isError, error, refetch } = usePendingMaterials()

  const list = materials ?? []

  return (
    <AppShell>
        <div className="max-w-4xl mx-auto space-y-6">

          {/* Cabeçalho */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ClipboardCheck size={20} className="text-indigo-600 dark:text-indigo-400" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Revisão de Materiais
              </h1>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Visualize o PDF, aprove ou rejeite os materiais submetidos por usuários institucionalizados.
            </p>
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

          {/* Vazio */}
          {!isLoading && !isError && list.length === 0 && (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <div className="rounded-full bg-green-50 dark:bg-green-950 p-5">
                <CheckCircle2 size={32} className="text-green-500 dark:text-green-400" />
              </div>
              <div className="space-y-1">
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  Nenhum material pendente
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Todos os materiais já foram revisados.
                </p>
              </div>
            </div>
          )}

          {/* Lista */}
          {!isLoading && !isError && list.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {list.length} {list.length === 1 ? 'material aguardando revisão' : 'materiais aguardando revisão'}
              </p>
              {list.map((m) => (
                <MaterialReviewCard key={m.id} material={m} />
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
