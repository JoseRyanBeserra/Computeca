// src/pages/InvitesPage.tsx
import { Bell, Check, X, Users } from 'lucide-react'
import { useMyInvites } from '../features/organizations/hooks/useMyInvites'
import { useRespondInvite } from '../features/organizations/hooks/useRespondInvite'
import { AppShell } from '../components/AppShell'
import type { OrgInviteDTO } from '../features/organizations/api/organizationsApi'

const STATUS_LABEL: Record<OrgInviteDTO['status'], string> = {
  PENDING:   'Pendente',
  ACCEPTED:  'Aceito',
  REJECTED:  'Recusado',
  CANCELLED: 'Cancelado',
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day:   '2-digit',
    month: '2-digit',
    year:  'numeric',
  })
}

export function InvitesPage() {
  const { data: invites, isLoading } = useMyInvites()
  const respondMutation = useRespondInvite()

  async function handleRespond(inviteId: string, action: 'ACCEPT' | 'REJECT') {
    try {
      await respondMutation.mutateAsync({ inviteId, action })
    } catch {
      // error handled inline per card
    }
  }

  const pending  = invites?.filter((i) => i.status === 'PENDING') ?? []
  const resolved = invites?.filter((i) => i.status !== 'PENDING') ?? []

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Bell size={20} className="text-indigo-600 dark:text-indigo-400" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Convites</h1>
        </div>

        {isLoading && (
          <p className="text-sm text-gray-500 dark:text-gray-400">Carregando convites…</p>
        )}

        {!isLoading && invites?.length === 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
            <Users size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Você não tem nenhum convite.</p>
          </div>
        )}

        {/* Pending invites */}
        {pending.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Pendentes</h2>
            {pending.map((invite) => (
              <div
                key={invite.id}
                className="bg-white dark:bg-gray-900 rounded-xl border border-indigo-200 dark:border-indigo-800 p-5"
              >
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {invite.organization.name}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  Convidado por <span className="text-gray-600 dark:text-gray-300">{invite.invitedBy.name}</span> · {formatDate(invite.createdAt)}
                </p>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => handleRespond(invite.id, 'ACCEPT')}
                    disabled={respondMutation.isPending}
                    className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Check size={14} /> Aceitar
                  </button>
                  <button
                    onClick={() => handleRespond(invite.id, 'REJECT')}
                    disabled={respondMutation.isPending}
                    className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <X size={14} /> Recusar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Resolved invites */}
        {resolved.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Histórico</h2>
            {resolved.map((invite) => (
              <div
                key={invite.id}
                className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 px-5 py-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{invite.organization.name}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {formatDate(invite.createdAt)}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                    ${invite.status === 'ACCEPTED'  ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300' : ''}
                    ${invite.status === 'REJECTED'  ? 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400' : ''}
                    ${invite.status === 'CANCELLED' ? 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400' : ''}
                  `}>
                    {STATUS_LABEL[invite.status]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
