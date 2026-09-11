// src/pages/AdminUsersPage.tsx
import { useState } from 'react'
import {
  Users,
  GraduationCap,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  Loader2,
  Check,
  X,
} from 'lucide-react'
import { AppShell } from '../components/AppShell'
import { useUsers } from '../features/users/hooks/useUsers'
import { useSetAsProfessor } from '../features/users/hooks/useSetAsProfessor'
import { getApiErrorMessage } from '../lib/apiError'
import type { Role } from '../types/auth'
import type { AdminUser } from '../features/users/api/usersApi'

// ── Helpers ───────────────────────────────────────────────────────────────────

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
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    .format(new Date(iso))
}

const PROMOTABLE_ROLES: Role[] = ['COMMON', 'INSTITUTIONALIZED']

// ── Tab filters ───────────────────────────────────────────────────────────────

const TABS: { label: string; value: Role | undefined }[] = [
  { label: 'Todos',              value: undefined },
  { label: 'Usuários',           value: 'COMMON' },
  { label: 'Institucionalizados', value: 'INSTITUTIONALIZED' },
  { label: 'Professores',        value: 'PROFESSOR' },
]

// ── UserCard ──────────────────────────────────────────────────────────────────

interface UserCardProps { user: AdminUser }

function UserCard({ user }: UserCardProps) {
  const [confirming, setConfirming] = useState(false)
  const { mutate: promote, isPending, isSuccess, error, reset } = useSetAsProfessor()

  const canPromote = PROMOTABLE_ROLES.includes(user.role) && !user.suspended

  function handleConfirm() {
    promote(user.id, {
      onSuccess: () => setConfirming(false),
    })
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4
                    hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors">
      <div className="flex items-start gap-4">

        {/* Avatar */}
        <div className="shrink-0 w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-950
                        flex items-center justify-center text-indigo-700 dark:text-indigo-400
                        text-sm font-bold select-none">
          {getInitials(user.name)}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">
              {user.name}
            </p>
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${ROLE_BADGE[user.role]}`}>
              {ROLE_LABELS[user.role]}
            </span>
            {!user.emailVerified && (
              <span className="inline-flex items-center rounded-full border border-amber-200 dark:border-amber-800
                               bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 px-2 py-0.5 text-xs">
                Não verificado
              </span>
            )}
            {user.suspended && (
              <span className="inline-flex items-center rounded-full border border-red-200 dark:border-red-800
                               bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400 px-2 py-0.5 text-xs">
                Suspenso
              </span>
            )}
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>

          <p className="text-xs text-gray-400 dark:text-gray-500">
            Cadastrado em {formatDate(user.createdAt)}
          </p>

          {/* Erro de promoção */}
          {error && (
            <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1 mt-1">
              <AlertCircle size={11} />
              {getApiErrorMessage(error)}
            </p>
          )}
        </div>

        {/* Ações */}
        <div className="shrink-0 flex flex-col items-end gap-2">
          {isSuccess && (
            <span className="inline-flex items-center gap-1 text-xs text-green-700 dark:text-green-400 font-medium">
              <Check size={13} />
              Promovido
            </span>
          )}

          {!isSuccess && canPromote && !confirming && (
            <button
              onClick={() => { reset(); setConfirming(true) }}
              className="flex items-center gap-1.5 rounded-lg border border-indigo-200 dark:border-indigo-700
                         bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400
                         hover:bg-indigo-100 dark:hover:bg-indigo-900
                         px-3 py-1.5 text-xs font-medium transition-colors
                         focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
            >
              <GraduationCap size={13} />
              Promover para Professor
            </button>
          )}

          {!isSuccess && confirming && (
            <div className="flex items-center gap-2">
              <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Confirmar?</p>
              <button
                onClick={handleConfirm}
                disabled={isPending}
                className="flex items-center gap-1 rounded-lg bg-indigo-600 hover:bg-indigo-700
                           disabled:opacity-50 text-white px-2.5 py-1.5 text-xs font-medium transition-colors
                           focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {isPending ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                Sim
              </button>
              <button
                onClick={() => setConfirming(false)}
                disabled={isPending}
                className="flex items-center gap-1 rounded-lg border border-gray-300 dark:border-gray-600
                           bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300
                           hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50
                           px-2.5 py-1.5 text-xs font-medium transition-colors"
              >
                <X size={11} />
                Não
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── AdminUsersPage ────────────────────────────────────────────────────────────

export function AdminUsersPage() {
  const [activeTab, setActiveTab] = useState<Role | undefined>(undefined)

  const { data, isLoading, isError, error, refetch } = useUsers(activeTab)

  const users = data?.users ?? []
  const total = data?.total ?? 0

  return (
    <AppShell>
        <div className="max-w-5xl mx-auto space-y-6">

          {/* Cabeçalho */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck size={20} className="text-indigo-600 dark:text-indigo-400" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Gerenciar Usuários
              </h1>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Promova usuários para o cargo de Professor.
            </p>
          </div>

          {/* Tabs de filtro */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 w-fit flex-wrap">
            {TABS.map((tab) => (
              <button
                key={tab.label}
                onClick={() => setActiveTab(tab.value)}
                className={[
                  'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors focus:outline-none',
                  activeTab === tab.value
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
                  Não foi possível carregar os usuários
                </p>
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

          {/* Vazio */}
          {!isLoading && !isError && users.length === 0 && (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-5">
                <Users size={32} className="text-gray-400 dark:text-gray-500" />
              </div>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                Nenhum usuário encontrado
              </p>
            </div>
          )}

          {/* Lista */}
          {!isLoading && !isError && users.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {total} {total === 1 ? 'usuário encontrado' : 'usuários encontrados'}
              </p>
              {users.map((u) => (
                <UserCard key={u.id} user={u} />
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
