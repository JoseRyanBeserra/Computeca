// src/pages/AdminDashboardPage.tsx
// Painel administrativo: visão geral de usuários, materiais e projetos.
import { useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, CheckCircle2, Clock, Building2,
  ArrowRight, Loader2, AlertCircle, type LucideIcon,
} from 'lucide-react'
import { AppShell } from '../components/AppShell'
import { useUsers } from '../features/users/hooks/useUsers'
import { useAllMaterials } from '../features/materials/hooks/useAllMaterials'
import { useAllOrganizations } from '../features/organizations/hooks/useAllOrganizations'
import type { Role } from '../types/auth'
import type { AdminUser } from '../features/users/api/usersApi'
import type { AdminOrganizationDTO } from '../features/organizations/api/organizationsApi'

// ── Constantes ──────────────────────────────────────────────────────────────────

const PREVIEW_LIMIT = 6

const ROLE_LABELS: Record<Role, string> = {
  COMMON:            'Usuário',
  INSTITUTIONALIZED: 'Institucionalizado',
  PROFESSOR:         'Professor',
  ADMIN:             'Administrador',
}

const ROLE_BADGE: Record<Role, string> = {
  COMMON:            'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700',
  INSTITUTIONALIZED: 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  PROFESSOR:         'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800',
  ADMIN:             'bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800',
}

function getInitials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')
}

// ── Indicadores (KPIs) ────────────────────────────────────────────────────────

interface StatTileProps {
  icon:    LucideIcon
  label:   string
  value?:  number
  loading: boolean
  isError: boolean
  accent:  string
  onClick: () => void
}

function StatTile({ icon: Icon, label, value, loading, isError, accent, onClick }: StatTileProps) {
  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-4 rounded-xl border border-gray-200 dark:border-gray-700
                 bg-white dark:bg-gray-900 p-5 text-left transition-colors
                 hover:border-indigo-300 dark:hover:border-indigo-700
                 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-950"
    >
      <div className={`shrink-0 rounded-xl p-3 ${accent}`}>
        <Icon size={22} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
          {loading ? <Loader2 size={20} className="animate-spin text-gray-400" /> : isError ? '—' : value ?? 0}
        </p>
      </div>
      <ArrowRight
        size={16}
        className="ml-auto shrink-0 text-gray-300 dark:text-gray-600 transition-colors
                   group-hover:text-indigo-500 dark:group-hover:text-indigo-400"
      />
    </button>
  )
}

// ── Painel de pré-visualização (janelinha) ──────────────────────────────────────

interface PanelProps {
  title:    string
  icon:     LucideIcon
  count?:   number
  loading:  boolean
  isError:  boolean
  isEmpty:  boolean
  emptyMsg: string
  onSeeAll: () => void
  children: React.ReactNode
}

function PreviewPanel({ title, icon: Icon, count, loading, isError, isEmpty, emptyMsg, onSeeAll, children }: PanelProps) {
  return (
    <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
      <header className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-5 py-3.5">
        <div className="flex items-center gap-2">
          <Icon size={16} className="text-indigo-500 dark:text-indigo-400" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
          {typeof count === 'number' && (
            <span className="rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs font-medium text-gray-500 dark:text-gray-400">
              {count}
            </span>
          )}
        </div>
        <button
          onClick={onSeeAll}
          className="flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          Ver todos <ArrowRight size={12} />
        </button>
      </header>

      <div className="p-4">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={22} className="animate-spin text-indigo-500" />
          </div>
        )}
        {!loading && isError && (
          <div className="flex items-center gap-2 py-6 text-sm text-gray-500 dark:text-gray-400">
            <AlertCircle size={15} className="text-amber-500" /> Não foi possível carregar os dados.
          </div>
        )}
        {!loading && !isError && isEmpty && (
          <p className="py-6 text-center text-sm text-gray-400 dark:text-gray-500">{emptyMsg}</p>
        )}
        {!loading && !isError && !isEmpty && <div className="grid gap-2.5 sm:grid-cols-2">{children}</div>}
      </div>
    </section>
  )
}

// ── Cartões (janelinhas) ────────────────────────────────────────────────────────

function UserMiniCard({ user }: { user: AdminUser }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-950
                      text-sm font-bold text-indigo-700 dark:text-indigo-400 select-none">
        {getInitials(user.name)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{user.name}</p>
        <p className="truncate text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
      </div>
      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${ROLE_BADGE[user.role]}`}>
        {ROLE_LABELS[user.role]}
      </span>
    </div>
  )
}

function ProjectMiniCard({ org }: { org: AdminOrganizationDTO }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-950">
        <Building2 size={16} className="text-indigo-600 dark:text-indigo-400" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{org.name}</p>
        <p className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
          <Users size={11} /> {org.memberCount} {org.memberCount === 1 ? 'membro' : 'membros'}
        </p>
      </div>
    </div>
  )
}

// ── AdminDashboardPage ────────────────────────────────────────────────────────────

export function AdminDashboardPage() {
  const navigate = useNavigate()

  const usersQuery    = useUsers()
  const approvedQuery = useAllMaterials('APPROVED')
  const pendingQuery  = useAllMaterials('PENDING_REVIEW')
  const orgsQuery     = useAllOrganizations({ status: 'ACTIVE', perPage: PREVIEW_LIMIT })

  const users = usersQuery.data?.users?.slice(0, PREVIEW_LIMIT) ?? []
  const orgs  = orgsQuery.data?.organizations?.slice(0, PREVIEW_LIMIT) ?? []

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Cabeçalho */}
        <div className="flex items-center gap-2.5">
          <LayoutDashboard size={22} className="text-indigo-600 dark:text-indigo-400" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Painel administrativo</h1>
        </div>

        {/* Indicadores */}
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            icon={Users}
            label="Usuários"
            value={usersQuery.data?.total}
            loading={usersQuery.isLoading}
            isError={usersQuery.isError}
            accent="bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400"
            onClick={() => navigate('/admin/users')}
          />
          <StatTile
            icon={CheckCircle2}
            label="Materiais aprovados"
            value={approvedQuery.data?.total}
            loading={approvedQuery.isLoading}
            isError={approvedQuery.isError}
            accent="bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400"
            onClick={() => navigate('/professor/materials')}
          />
          <StatTile
            icon={Clock}
            label="Materiais em pendência"
            value={pendingQuery.data?.total}
            loading={pendingQuery.isLoading}
            isError={pendingQuery.isError}
            accent="bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400"
            onClick={() => navigate('/professor/review')}
          />
          <StatTile
            icon={Building2}
            label="Projetos ativos"
            value={orgsQuery.data?.total}
            loading={orgsQuery.isLoading}
            isError={orgsQuery.isError}
            accent="bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400"
            onClick={() => navigate('/organizations')}
          />
        </div>

        {/* Pré-visualizações */}
        <div className="grid gap-5 lg:grid-cols-2">
          <PreviewPanel
            title="Usuários"
            icon={Users}
            count={usersQuery.data?.total}
            loading={usersQuery.isLoading}
            isError={usersQuery.isError}
            isEmpty={users.length === 0}
            emptyMsg="Nenhum usuário cadastrado."
            onSeeAll={() => navigate('/admin/users')}
          >
            {users.map((u) => <UserMiniCard key={u.id} user={u} />)}
          </PreviewPanel>

          <PreviewPanel
            title="Projetos ativos"
            icon={Building2}
            count={orgsQuery.data?.total}
            loading={orgsQuery.isLoading}
            isError={orgsQuery.isError}
            isEmpty={orgs.length === 0}
            emptyMsg="Nenhum projeto ativo."
            onSeeAll={() => navigate('/organizations')}
          >
            {orgs.map((o) => <ProjectMiniCard key={o.id} org={o} />)}
          </PreviewPanel>
        </div>
      </div>
    </AppShell>
  )
}
