// src/pages/OrganizationDetailPage.tsx
import { useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Users, Trash2, LogOut, UserPlus, Archive, Pencil, Check, X, Mail, FileUp, BookOpen, ExternalLink } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useMyOrganizations } from '../features/organizations/hooks/useMyOrganizations'
import { useOrgMembers } from '../features/organizations/hooks/useOrgMembers'
import { useOrgMaterials } from '../features/organizations/hooks/useOrgMaterials'
import { useUploadOrgMaterial } from '../features/organizations/hooks/useUploadOrgMaterial'
import { useUpdateOrganization } from '../features/organizations/hooks/useUpdateOrganization'
import { useArchiveOrganization } from '../features/organizations/hooks/useArchiveOrganization'
import { useRemoveMember } from '../features/organizations/hooks/useRemoveMember'
import { useLeaveOrganization } from '../features/organizations/hooks/useLeaveOrganization'
import { useInviteUser } from '../features/organizations/hooks/useInviteUser'
import { getPublicPresignedUrlRequest } from '../features/materials/api/materialsApi'
import { AppShell } from '../components/AppShell'
import type { OrgListItemDTO } from '../features/organizations/api/organizationsApi'

const ROLE_LABEL: Record<string, string> = {
  ADMIN:     'Admin',
  PROFESSOR: 'Professor',
  MEMBER:    'Membro',
}

function getApiError(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const r = (err as { response: { data?: { message?: string } } }).response
    if (r?.data?.message) return r.data.message
  }
  return 'Ocorreu um erro inesperado.'
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function OrganizationDetailPage() {
  const navigate          = useNavigate()
  const { orgId }         = useParams<{ orgId: string }>()
  const { user }          = useAuth()

  const { data: orgs }    = useMyOrganizations()
  const org: OrgListItemDTO | undefined = orgs?.find((o) => o.id === orgId)

  const { data: members, isLoading: membersLoading } = useOrgMembers(orgId ?? '')

  const updateMutation  = useUpdateOrganization(orgId ?? '')
  const archiveMutation = useArchiveOrganization()
  const removeMutation  = useRemoveMember(orgId ?? '')
  const leaveMutation   = useLeaveOrganization()
  const inviteMutation  = useInviteUser(orgId ?? '')
  const uploadMutation  = useUploadOrgMaterial(orgId ?? '')

  const { data: materials, isLoading: materialsLoading } = useOrgMaterials(orgId ?? '')

  const [editing, setEditing]       = useState(false)
  const [editName, setEditName]     = useState('')
  const [editDesc, setEditDesc]     = useState('')

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteSuccess, setInviteSuccess] = useState('')
  const [inviteError, setInviteError]     = useState('')

  const [uploadFile, setUploadFile]       = useState<File | null>(null)
  const [uploadTitle, setUploadTitle]     = useState('')
  const [uploadError, setUploadError]     = useState('')
  const [uploadSuccess, setUploadSuccess] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [actionError, setActionError] = useState('')

  if (!orgId) return null

  const isOrgAdmin    = org?.myRole === 'ADMIN'
  const isStaff       = org?.myRole === 'ADMIN' || org?.myRole === 'PROFESSOR'
  const isArchived    = org?.status === 'ARCHIVED'
  const currentUserId = user?.id
  const canUpload     = !!(
    user?.canUpload ||
    ['INSTITUTIONALIZED', 'PROFESSOR', 'ADMIN'].includes(user?.role ?? '')
  )

  function startEdit() {
    setEditName(org?.name ?? '')
    setEditDesc(org?.description ?? '')
    setEditing(true)
  }

  async function submitEdit() {
    try {
      await updateMutation.mutateAsync({ name: editName.trim() || undefined, description: editDesc || undefined })
      setEditing(false)
      setActionError('')
    } catch (e) {
      setActionError(getApiError(e))
    }
  }

  async function handleArchive() {
    if (!window.confirm('Arquivar este projeto? Esta ação não pode ser desfeita facilmente.')) return
    try {
      await archiveMutation.mutateAsync(orgId!)
      navigate('/organizations')
    } catch (e) {
      setActionError(getApiError(e))
    }
  }

  async function handleRemoveMember(userId: string) {
    if (!window.confirm('Remover este membro do projeto?')) return
    try {
      await removeMutation.mutateAsync(userId)
      setActionError('')
    } catch (e) {
      setActionError(getApiError(e))
    }
  }

  async function handleLeave() {
    if (!window.confirm('Sair deste projeto?')) return
    try {
      await leaveMutation.mutateAsync(orgId!)
      navigate('/organizations')
    } catch (e) {
      setActionError(getApiError(e))
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviteError('')
    setInviteSuccess('')
    try {
      await inviteMutation.mutateAsync(inviteEmail.trim())
      setInviteSuccess(`Convite enviado para ${inviteEmail}`)
      setInviteEmail('')
    } catch (e) {
      setInviteError(getApiError(e))
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!uploadFile) return
    setUploadError('')
    setUploadSuccess('')
    try {
      const mi = await uploadMutation.mutateAsync({ file: uploadFile, title: uploadTitle || undefined })
      setUploadSuccess(`"${mi.title}" enviado para revisão.`)
      setUploadFile(null)
      setUploadTitle('')
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (e) {
      setUploadError(getApiError(e))
    }
  }

  async function handleOpenMaterial(materialId: string) {
    try {
      const { url } = await getPublicPresignedUrlRequest(materialId)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch {
      // silently ignore — URL expiration or permission issue
    }
  }

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Org not found */}
        {!org && (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">Projeto não encontrado.</p>
          </div>
        )}

        {org && (
          <>
            {/* Header do Org */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  {editing ? (
                    <div className="space-y-3">
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        maxLength={80}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm
                                   bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                                   focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Nome do projeto"
                      />
                      <textarea
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        maxLength={300}
                        rows={2}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm
                                   bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                                   focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                        placeholder="Descrição (opcional)"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={submitEdit}
                          disabled={updateMutation.isPending}
                          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <Check size={14} /> Salvar
                        </button>
                        <button
                          onClick={() => setEditing(false)}
                          className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <X size={14} /> Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">{org.name}</h1>
                        {isArchived && (
                          <span className="text-xs px-1.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300">
                            Arquivado
                          </span>
                        )}
                      </div>
                      {org.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{org.description}</p>
                      )}
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{org.memberCount} membro(s)</p>
                    </>
                  )}
                </div>

                {/* Actions */}
                {!editing && !isArchived && (
                  <div className="flex items-center gap-2 shrink-0">
                    {isOrgAdmin && (
                      <>
                        <button
                          onClick={startEdit}
                          className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                        >
                          <Pencil size={15} /> Editar
                        </button>
                        <button
                          onClick={handleArchive}
                          disabled={archiveMutation.isPending}
                          className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
                        >
                          <Archive size={15} /> Arquivar
                        </button>
                      </>
                    )}
                    {!isOrgAdmin && (
                      <button
                        onClick={handleLeave}
                        disabled={leaveMutation.isPending}
                        className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
                      >
                        <LogOut size={15} /> Sair
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Error banner */}
            {actionError && (
              <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 text-sm text-red-700 dark:text-red-300">
                {actionError}
              </div>
            )}

            {/* Invite form */}
            {isStaff && !isArchived && (
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                  <Mail size={15} />
                  Convidar membro
                </h2>
                <form onSubmit={handleInvite} className="flex gap-2">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="email@dcx.ufpb.br"
                    required
                    className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm
                               bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                               focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={inviteMutation.isPending}
                    className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <UserPlus size={15} />
                    Convidar
                  </button>
                </form>
                {inviteSuccess && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2">{inviteSuccess}</p>
                )}
                {inviteError && (
                  <p className="text-xs text-red-500 dark:text-red-400 mt-2">{inviteError}</p>
                )}
              </div>
            )}

            {/* Members list */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <Users size={15} />
                Membros
              </h2>

              {membersLoading && (
                <p className="text-sm text-gray-400 dark:text-gray-500">Carregando membros…</p>
              )}

              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {members?.map((m) => (
                  <div key={m.id} className="py-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{m.user.name}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{m.user.email}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full
                        ${m.role === 'ADMIN' ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300' : ''}
                        ${m.role === 'PROFESSOR' ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300' : ''}
                        ${m.role === 'MEMBER' ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400' : ''}
                      `}>
                        {ROLE_LABEL[m.role]}
                      </span>
                      {isOrgAdmin && m.role !== 'ADMIN' && m.userId !== currentUserId && !isArchived && (
                        <button
                          onClick={() => handleRemoveMember(m.userId)}
                          disabled={removeMutation.isPending}
                          className="text-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
                          aria-label="Remover membro"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Upload de material */}
            {canUpload && !isArchived && (
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                  <FileUp size={15} />
                  Enviar material para este projeto
                </h2>
                <form onSubmit={handleUpload} className="space-y-3">
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,application/pdf"
                      required
                      onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                      className="block w-full text-sm text-gray-500 dark:text-gray-400
                                 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0
                                 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700
                                 dark:file:bg-indigo-900 dark:file:text-indigo-300
                                 hover:file:bg-indigo-100 dark:hover:file:bg-indigo-800 cursor-pointer"
                    />
                    {uploadFile && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {uploadFile.name} — {formatBytes(uploadFile.size)}
                      </p>
                    )}
                  </div>
                  <input
                    type="text"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="Título (opcional — padrão: nome do arquivo)"
                    maxLength={200}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm
                               bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                               focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={!uploadFile || uploadMutation.isPending}
                    className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <FileUp size={14} />
                    {uploadMutation.isPending ? 'Enviando…' : 'Enviar'}
                  </button>
                </form>
                {uploadSuccess && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2">{uploadSuccess}</p>
                )}
                {uploadError && (
                  <p className="text-xs text-red-500 dark:text-red-400 mt-2">{uploadError}</p>
                )}
              </div>
            )}

            {/* Materiais do projeto */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <BookOpen size={15} />
                Materiais do projeto
              </h2>

              {materialsLoading && (
                <p className="text-sm text-gray-400 dark:text-gray-500">Carregando materiais…</p>
              )}

              {!materialsLoading && (!materials || materials.length === 0) && (
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  Nenhum material aprovado neste projeto ainda.
                </p>
              )}

              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {materials?.map((m) => (
                  <div key={m.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{m.title}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {formatBytes(m.sizeBytes)} · {formatDate(m.createdAt)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleOpenMaterial(m.id)}
                      className="shrink-0 flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 transition-colors"
                    >
                      <ExternalLink size={13} />
                      Abrir PDF
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}
