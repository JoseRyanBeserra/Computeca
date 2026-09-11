// src/pages/OrganizationsListPage.tsx
import { useNavigate } from 'react-router-dom'
import { FolderPlus, Users, Archive } from 'lucide-react'
import { useMyOrganizations } from '../features/organizations/hooks/useMyOrganizations'
import { useAuth } from '../context/AuthContext'
import { AppShell } from '../components/AppShell'

const ROLE_LABEL: Record<string, string> = {
  ADMIN:     'Administrador',
  PROFESSOR: 'Professor',
  MEMBER:    'Membro',
}

export function OrganizationsListPage() {
  const navigate  = useNavigate()
  const { user }  = useAuth()
  const { data: orgs, isLoading, error } = useMyOrganizations()

  const canCreate = user?.role === 'PROFESSOR' || user?.role === 'ADMIN'

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Projetos</h1>
          {canCreate && (
            <button
              onClick={() => navigate('/organizations/create')}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <FolderPlus size={16} />
              Nova
            </button>
          )}
        </div>

        {/* Estado de carregamento */}
        {isLoading && (
          <p className="text-sm text-gray-500 dark:text-gray-400">Carregando projetos…</p>
        )}

        {/* Erro */}
        {error && (
          <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 text-sm text-red-700 dark:text-red-300">
            Erro ao carregar projetos.
          </div>
        )}

        {/* Lista vazia */}
        {orgs && orgs.length === 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
            <Users size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Você ainda não faz parte de nenhum projeto.
            </p>
            {canCreate && (
              <button
                onClick={() => navigate('/organizations/create')}
                className="mt-4 text-indigo-600 dark:text-indigo-400 text-sm font-medium hover:underline"
              >
                Criar primeiro projeto
              </button>
            )}
          </div>
        )}

        <div className="space-y-3">
          {orgs?.map((org) => (
            <button
              key={org.id}
              onClick={() => navigate(`/organizations/${org.id}`)}
              className="w-full text-left bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700
                         hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-sm
                         px-5 py-4 transition-all duration-150
                         focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-950"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 bg-indigo-50 dark:bg-indigo-950 rounded-lg p-2 mt-0.5">
                    {org.status === 'ARCHIVED' ? (
                      <Archive size={18} className="text-gray-400 dark:text-gray-500" />
                    ) : (
                      <Users size={18} className="text-indigo-600 dark:text-indigo-400" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{org.name}</p>
                    {org.description && (
                      <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5 line-clamp-2">{org.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-xs text-gray-400 dark:text-gray-500">{org.memberCount} membro(s)</span>
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full
                        ${org.myRole === 'ADMIN' ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300' : ''}
                        ${org.myRole === 'PROFESSOR' ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300' : ''}
                        ${org.myRole === 'MEMBER' ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400' : ''}
                      `}>
                        {ROLE_LABEL[org.myRole]}
                      </span>
                      {org.status === 'ARCHIVED' && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300">
                          Arquivado
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </AppShell>
  )
}
