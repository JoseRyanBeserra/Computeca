// src/pages/PublicMaterialsPage.tsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  BookOpen, LogOut, ArrowLeft, Library,
  FileText, ExternalLink, AlertCircle, RefreshCw, Loader2,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { ThemeToggle } from '../components/ThemeToggle'
import { HabilidadesBncc } from '../components/HabilidadesBncc'
import { usePublicMaterials } from '../features/materials/hooks/usePublicMaterials'
import { getPublicPresignedUrlRequest } from '../features/materials/api/materialsApi'
import { getApiErrorMessage } from '../lib/apiError'
import type { Role } from '../types/auth'
import type { PendingMaterial } from '../features/materials/api/materialsApi'

// ── Helpers ───────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<Role, string> = {
  COMMON:            'Usuário',
  INSTITUTIONALIZED: 'Institucionalizado',
  PROFESSOR:         'Professor',
  ADMIN:             'Administrador',
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(new Date(iso))
}

// ── Topbar ────────────────────────────────────────────────────────────────────

interface TopbarProps { userName: string; userRole: Role; onBack: () => void; onLogout: () => void }

function Topbar({ userName, userRole, onBack, onLogout }: TopbarProps) {
  return (
    <header className="bg-indigo-700 text-white px-6 py-4">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} aria-label="Voltar"
            className="flex items-center gap-1.5 text-indigo-200 hover:text-white text-sm transition-colors
                       focus:outline-none focus:ring-2 focus:ring-white/50 rounded-lg px-2 py-1">
            <ArrowLeft size={16} /><span className="hidden sm:inline">Voltar</span>
          </button>
          <div className="w-px h-5 bg-white/20" />
          <div className="flex items-center gap-2">
            <div className="bg-white/10 rounded-xl p-2"><BookOpen size={18} /></div>
            <div>
              <p className="font-bold text-sm leading-tight">MI</p>
              <p className="text-indigo-200 text-xs">Materiais Instrucionais · UFPB</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-medium leading-tight">{userName}</p>
            <p className="text-indigo-200 text-xs">{ROLE_LABELS[userRole]}</p>
          </div>
          <ThemeToggle className="text-indigo-200 hover:text-white hover:bg-white/10 focus:ring-white/50 focus:ring-offset-indigo-700" />
          <button onClick={onLogout} aria-label="Sair"
            className="flex items-center gap-1.5 text-indigo-200 hover:text-white text-sm transition-colors
                       focus:outline-none focus:ring-2 focus:ring-white/50 rounded-lg px-2 py-1">
            <LogOut size={16} /><span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </div>
    </header>
  )
}

// ── MaterialCard ──────────────────────────────────────────────────────────────

function MaterialCard({ material }: { material: PendingMaterial }) {
  const navigate = useNavigate()
  const [isOpening, setIsOpening] = useState(false)
  const [viewError, setViewError] = useState<string | null>(null)

  async function handleView() {
    setIsOpening(true)
    setViewError(null)
    try {
      const { url } = await getPublicPresignedUrlRequest(material.id)
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
                 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-sm transition-all">
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

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400 dark:text-gray-500">
            <span>
              Por{' '}
              <span className="text-gray-600 dark:text-gray-300 font-medium">
                {material.uploadedBy.name}
              </span>
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
        </div>

        {/* Botão visualizar */}
        <button
          onClick={(e) => { e.stopPropagation(); handleView() }}
          disabled={isOpening}
          aria-label={`Visualizar ${material.title}`}
          className="shrink-0 flex items-center gap-1.5 rounded-lg border border-indigo-200 dark:border-indigo-700
                     bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400
                     hover:bg-indigo-100 dark:hover:bg-indigo-900 disabled:opacity-50
                     px-3 py-1.5 text-xs font-medium transition-colors
                     focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
        >
          {isOpening
            ? <Loader2 size={13} className="animate-spin" />
            : <ExternalLink size={13} />}
          <span className="hidden sm:inline">{isOpening ? 'Abrindo…' : 'Abrir PDF'}</span>
        </button>
      </div>
    </div>
  )
}

// ── PublicMaterialsPage ───────────────────────────────────────────────────────

export function PublicMaterialsPage() {
  const { user, clearSession } = useAuth()
  const navigate = useNavigate()
  const [page, setPage] = useState(1)

  const { data, isLoading, isError, error, refetch } = usePublicMaterials(page)

  function handleLogout() {
    clearSession()
    navigate('/login', { replace: true })
  }

  const materials  = data?.materials ?? []
  const total      = data?.total     ?? 0
  const totalPages = Math.ceil(total / 25)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      <Topbar
        userName={user?.name ?? ''}
        userRole={user?.role ?? 'COMMON'}
        onBack={() => navigate('/')}
        onLogout={handleLogout}
      />

      <main className="flex-1 px-6 py-10">
        <div className="max-w-5xl mx-auto space-y-6">

          {/* Cabeçalho */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Library size={20} className="text-indigo-600 dark:text-indigo-400" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Acervo de Materiais
              </h1>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Materiais instrucionais aprovados e disponíveis para consulta.
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

          {/* Lista */}
          {!isLoading && !isError && (
            <div className="space-y-4">

              {/* Contador + paginação */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {total === 0
                    ? 'Nenhum material disponível ainda'
                    : `${total} ${total === 1 ? 'material disponível' : 'materiais disponíveis'} — página ${page} de ${Math.max(1, totalPages)}`}
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
                    <span className="text-xs text-gray-500 dark:text-gray-400">{page}/{totalPages}</span>
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
                    <Library size={32} className="text-gray-400 dark:text-gray-500" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      Nenhum material disponível
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Os materiais aprovados pelos professores aparecerão aqui.
                    </p>
                  </div>
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
      </main>
    </div>
  )
}
