// src/pages/HomePage.tsx
// Tela inicial no estilo MEC RED: grade de recursos (materiais aprovados) com
// miniatura, filtros e busca, dentro do layout AppShell.
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertCircle, RefreshCw, Loader2, Library, LogIn,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { AppShell } from '../components/AppShell'
import { ResourceCard } from '../components/ResourceCard'
import { HabilidadeFilter } from '../components/HabilidadeFilter'
import { usePublicMaterials } from '../features/materials/hooks/usePublicMaterials'
import { useHabilidades } from '../features/materials/hooks/useHabilidades'
import { getApiErrorMessage } from '../lib/apiError'
import { canUseAiChat } from '../lib/permissions'
import type { PendingMaterial } from '../features/materials/api/materialsApi'

// ── Ordenação (tabs estilo "MEC Recomenda / Recentes / …") ──────────────────────

type SortKey = 'recent' | 'oldest' | 'az'

const TABS: { label: string; value: SortKey }[] = [
  { label: 'Mais recentes', value: 'recent' },
  { label: 'Mais antigos',  value: 'oldest' },
  { label: 'A–Z',           value: 'az' },
]

function sortMaterials(list: PendingMaterial[], key: SortKey): PendingMaterial[] {
  const copy = [...list]
  if (key === 'az') return copy.sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'))
  return copy.sort((a, b) => {
    const da = new Date(a.createdAt).getTime()
    const db = new Date(b.createdAt).getTime()
    return key === 'recent' ? db - da : da - db
  })
}

// ── Card de material (navega para a tela de detalhe) ─────────────────────────────

function PublicResourceCard({ material }: { material: PendingMaterial }) {
  const navigate = useNavigate()
  const { user } = useAuth()

  function handleChat() {
    navigate(`/materials/${material.id}/chat`, { state: { material } })
  }

  const organizationName = material.organizations?.[0]?.organization.name

  return (
    <ResourceCard
      id={material.id}
      title={material.title}
      authorName={material.uploadedBy?.name}
      sizeBytes={material.sizeBytes}
      createdAt={material.createdAt}
      habilidades={material.habilidadesBncc}
      organizationName={organizationName}
      detailTo={`/materials/${material.id}`}
      onChat={canUseAiChat(user) ? handleChat : undefined}
    />
  )
}

// ── HomePage ──────────────────────────────────────────────────────────────────

export function HomePage() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [sort, setSort] = useState<SortKey>('recent')
  const [tabLabel, setTabLabel] = useState(TABS[0].label)
  const [mode, setMode] = useState<'resources' | 'collections'>('resources')
  const [selectedHabilidades, setSelectedHabilidades] = useState<string[]>([])
  const [semHabilidade, setSemHabilidade] = useState(false)

  // A busca é enviada ao servidor (cobre o acervo inteiro, não só a página atual).
  // Debounce para não disparar uma requisição a cada tecla.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350)
    return () => clearTimeout(timer)
  }, [search])

  // Mudou o termo efetivo da busca → volta para a primeira página
  useEffect(() => {
    setPage(1)
  }, [debouncedSearch])

  const { data: habilidadesDisponiveis = [] } = useHabilidades(isAuthenticated)
  const { data, isLoading, isError, error, refetch } = usePublicMaterials(page, {
    habilidades: selectedHabilidades,
    semHabilidade,
    search: debouncedSearch,
  })

  const hasActiveFilters = selectedHabilidades.length > 0 || semHabilidade

  function toggleHabilidade(habilidade: string) {
    setPage(1)
    setSelectedHabilidades((prev) =>
      prev.includes(habilidade) ? prev.filter((h) => h !== habilidade) : [...prev, habilidade],
    )
  }

  function toggleSemHabilidade() {
    setPage(1)
    setSemHabilidade((v) => !v)
  }

  function clearFilters() {
    setPage(1)
    setSelectedHabilidades([])
    setSemHabilidade(false)
  }

  const materials = data?.materials ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / 25)

  const visible = useMemo(() => sortMaterials(materials, sort), [materials, sort])

  return (
    <AppShell searchValue={search} onSearchChange={setSearch}>
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Linha de modo: Recursos / Coleções */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <span className="flex items-center gap-2 font-semibold text-gray-700 dark:text-gray-200">
            <Library size={18} className="text-indigo-600 dark:text-indigo-400" />
            Exibindo recursos disponíveis na plataforma
          </span>
          <div className="flex items-center gap-4">
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="mode"
                checked={mode === 'resources'}
                onChange={() => setMode('resources')}
                className="accent-indigo-600"
              />
              <span className={mode === 'resources' ? 'font-medium text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}>
                Recursos
              </span>
            </label>
            <label className="inline-flex items-center gap-1.5 cursor-not-allowed opacity-60" title="Em breve">
              <input type="radio" name="mode" disabled className="accent-indigo-600" />
              <span className="text-gray-500 dark:text-gray-400">Coleções</span>
            </label>
          </div>
        </div>

        {/* Tabs de ordenação */}
        <div className="flex flex-wrap items-center gap-2">
          {TABS.map((tab) => {
            const active = tabLabel === tab.label
            return (
              <button
                key={tab.label}
                onClick={() => { setTabLabel(tab.label); setSort(tab.value) }}
                className={[
                  'rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-indigo-700 text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700',
                ].join(' ')}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Filtro por habilidade BNCC (busca + autocomplete) */}
        {isAuthenticated && (habilidadesDisponiveis.length > 0 || hasActiveFilters) && (
          <HabilidadeFilter
            available={habilidadesDisponiveis}
            selected={selectedHabilidades}
            semHabilidade={semHabilidade}
            onToggleHabilidade={toggleHabilidade}
            onToggleSemHabilidade={toggleSemHabilidade}
            onClear={clearFilters}
          />
        )}

        {/* Título da seção */}
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          Recursos disponíveis
        </h1>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={30} className="animate-spin text-indigo-500" />
          </div>
        )}

        {/* Erro — usuário anônimo precisa entrar para carregar os materiais */}
        {isError && !isAuthenticated && (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <div className="rounded-full bg-indigo-50 dark:bg-indigo-950 p-4">
              <LogIn size={28} className="text-indigo-500 dark:text-indigo-400" />
            </div>
            <div className="space-y-1">
              <p className="font-medium text-gray-900 dark:text-gray-100">Entre para ver os materiais</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Faça login com sua conta para consultar o acervo de materiais instrucionais.
              </p>
            </div>
            <button
              onClick={() => navigate('/login')}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5
                         text-sm font-semibold text-white transition-colors
                         focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              <LogIn size={15} /> Entrar
            </button>
          </div>
        )}

        {/* Erro — usuário autenticado, falha real de carregamento */}
        {isError && isAuthenticated && (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <div className="rounded-full bg-red-50 dark:bg-red-950 p-4">
              <AlertCircle size={28} className="text-red-500 dark:text-red-400" />
            </div>
            <div className="space-y-1">
              <p className="font-medium text-gray-900 dark:text-gray-100">Não foi possível carregar os recursos</p>
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

        {/* Conteúdo */}
        {!isLoading && !isError && (
          visible.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-20 text-center">
              <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-5">
                <Library size={32} className="text-gray-400 dark:text-gray-500" />
              </div>
              <div className="space-y-1">
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {search
                    ? 'Nenhum recurso encontrado para a sua busca'
                    : hasActiveFilters
                      ? 'Nenhum recurso para os filtros selecionados'
                      : 'Nenhum recurso disponível'}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {search
                    ? 'Tente outros termos de pesquisa.'
                    : hasActiveFilters
                      ? 'Ajuste ou limpe os filtros de habilidade.'
                      : 'Os materiais aprovados pelos professores aparecerão aqui.'}
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {visible.map((m) => (
                  <PublicResourceCard key={m.id} material={m} />
                ))}
              </div>

              {/* Paginação */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800
                               text-gray-700 dark:text-gray-300 px-4 py-1.5 text-sm disabled:opacity-40
                               hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Anterior
                  </button>
                  <span className="text-sm text-gray-500 dark:text-gray-400 px-2">
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800
                               text-gray-700 dark:text-gray-300 px-4 py-1.5 text-sm disabled:opacity-40
                               hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Próxima
                  </button>
                </div>
              )}
            </>
          )
        )}
      </div>
    </AppShell>
  )
}
