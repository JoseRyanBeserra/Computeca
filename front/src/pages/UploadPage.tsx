// src/pages/UploadPage.tsx
import { useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  UploadCloud,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  Users,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { AppShell } from '../components/AppShell'
import { BnccHabilidadePicker } from '../components/BnccHabilidadePicker'
import { canUploadMaterials } from '../lib/permissions'
import { useUploadMaterial } from '../features/materials/hooks/useUploadMaterial'
import { useMyOrganizations } from '../features/organizations/hooks/useMyOrganizations'
import { getApiErrorCode, getApiErrorMessage } from '../lib/apiError'
import type { UploadedMI } from '../features/materials/api/materialsApi'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function friendlyError(error: unknown): string {
  const code = getApiErrorCode(error)
  if (code === 'UPLOAD_NOT_ALLOWED') return 'Você não tem permissão para fazer upload de materiais.'
  if (code === 'INVALID_FILE_TYPE')  return 'O arquivo enviado não é um PDF válido.'
  if (code === 'FILE_TOO_LARGE')     return 'O arquivo excede o tamanho máximo permitido (50 MB).'
  return getApiErrorMessage(error)
}

// ── Dropzone ──────────────────────────────────────────────────────────────────

interface DropzoneProps {
  file: File | null
  onFileSelect: (file: File) => void
  onFileRemove: () => void
  disabled?: boolean
}

function Dropzone({ file, onFileSelect, onFileRemove, disabled = false }: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragging(false)
      if (disabled) return
      const dropped = e.dataTransfer.files[0]
      if (dropped) onFileSelect(dropped)
    },
    [disabled, onFileSelect],
  )

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (!disabled) setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0]
    if (picked) onFileSelect(picked)
    e.target.value = ''
  }

  if (file) {
    return (
      <div className="flex items-center justify-between gap-4 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950 px-5 py-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="shrink-0 bg-indigo-100 dark:bg-indigo-900 rounded-lg p-2">
            <FileText size={20} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{file.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{formatBytes(file.size)}</p>
          </div>
        </div>
        {!disabled && (
          <button
            type="button"
            onClick={onFileRemove}
            aria-label="Remover arquivo"
            className="shrink-0 text-gray-400 dark:text-gray-500 hover:text-red-500 transition-colors
                       focus:outline-none focus:ring-2 focus:ring-red-300 rounded-lg p-1"
          >
            <X size={18} />
          </button>
        )}
      </div>
    )
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => !disabled && inputRef.current?.click()}
      role="button"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click() }}
      aria-label="Área de upload — clique ou arraste um PDF"
      className={[
        'flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors',
        disabled
          ? 'cursor-not-allowed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900'
          : isDragging
            ? 'cursor-copy border-indigo-400 bg-indigo-50 dark:bg-indigo-950'
            : 'cursor-pointer border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 hover:border-indigo-400 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/40',
      ].join(' ')}
    >
      <div className={`rounded-full p-4 ${isDragging ? 'bg-indigo-100 dark:bg-indigo-900' : 'bg-gray-100 dark:bg-gray-800'}`}>
        <UploadCloud size={28} className={isDragging ? 'text-indigo-500' : 'text-gray-400 dark:text-gray-500'} />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {isDragging ? 'Solte o arquivo aqui' : 'Arraste um PDF ou clique para selecionar'}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Somente PDF · máximo 50 MB</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="sr-only"
        onChange={handleInputChange}
        disabled={disabled}
        tabIndex={-1}
      />
    </div>
  )
}

// ── SuccessState ──────────────────────────────────────────────────────────────

interface SuccessStateProps {
  material: UploadedMI
  onUploadAnother: () => void
  onGoHome: () => void
}

function SuccessState({ material, onUploadAnother, onGoHome }: SuccessStateProps) {
  return (
    <div className="flex flex-col items-center gap-6 py-8 text-center">
      <div className="rounded-full bg-green-100 dark:bg-green-950 p-5">
        <CheckCircle2 size={40} className="text-green-600 dark:text-green-400" />
      </div>
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Material enviado com sucesso!</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
          <span className="font-medium text-gray-700 dark:text-gray-300">{material.title}</span> foi enviado e aguarda
          revisão de um professor antes de ser publicado.
        </p>
      </div>
      <div className="rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-5 py-4 w-full text-left space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-gray-500 dark:text-gray-400">Arquivo</span>
          <span className="text-gray-700 dark:text-gray-300 font-medium truncate ml-4 max-w-[60%] text-right">
            {material.originalFileName}
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-500 dark:text-gray-400">Tamanho</span>
          <span className="text-gray-700 dark:text-gray-300 font-medium">{formatBytes(material.sizeBytes)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-500 dark:text-gray-400">Status</span>
          <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Aguardando revisão
          </span>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 w-full">
        <button
          onClick={onUploadAnother}
          className="flex-1 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm font-medium
                     text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors
                     focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
        >
          Enviar outro material
        </button>
        <button
          onClick={onGoHome}
          className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white
                     hover:bg-indigo-700 transition-colors
                     focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
        >
          Ir para o início
        </button>
      </div>
    </div>
  )
}

// ── UploadPage ────────────────────────────────────────────────────────────────

export function UploadPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [habilidadesBncc, setHabilidadesBncc] = useState<string[]>([])
  const [selectedOrgId, setSelectedOrgId] = useState('')

  function addHabilidade(value: string) {
    const trimmed = value.trim()
    if (!trimmed) return
    setHabilidadesBncc((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]))
  }

  function removeHabilidade(value: string) {
    setHabilidadesBncc((prev) => prev.filter((h) => h !== value))
  }

  const { mutate, isPending, isSuccess, data: uploadedMaterial, error, reset } = useUploadMaterial()
  const { data: orgs } = useMyOrganizations()

  const activeOrgs = orgs?.filter((o) => o.status === 'ACTIVE') ?? []

  function handleFileSelect(selected: File) {
    setFile(selected)
    if (!title.trim()) {
      setTitle(selected.name.replace(/\.pdf$/i, ''))
    }
  }

  function handleFileRemove() {
    setFile(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    mutate({
      file,
      title: title.trim() || undefined,
      habilidadesBncc: habilidadesBncc.length ? habilidadesBncc : undefined,
      organizationId: selectedOrgId || undefined,
    })
  }

  function handleUploadAnother() {
    setFile(null)
    setTitle('')
    setHabilidadesBncc([])
    setSelectedOrgId('')
    reset()
  }

  const canUpload = canUploadMaterials(user)
  const isUploading = isPending

  return (
    <AppShell>
        <div className="max-w-3xl mx-auto space-y-6">

          {/* Cabeçalho da página */}
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Upload de Material</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Envie um material instrucional em PDF para análise e publicação.
            </p>
          </div>

          {/* Sem permissão de upload */}
          {!canUpload && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 px-5 py-4">
              <AlertCircle size={18} className="shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                  Permissão de upload não habilitada
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Sua conta ainda não tem permissão para enviar materiais. Entre em contato com um
                  administrador ou professor para solicitar acesso.
                </p>
              </div>
            </div>
          )}

          {/* Card principal */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">

            {/* Estado de sucesso */}
            {isSuccess && uploadedMaterial && (
              <SuccessState
                material={uploadedMaterial}
                onUploadAnother={handleUploadAnother}
                onGoHome={() => navigate('/')}
              />
            )}

            {/* Formulário de upload */}
            {!isSuccess && (
              <form onSubmit={handleSubmit} className="space-y-5">

                {/* Dropzone */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Arquivo PDF <span className="text-red-500">*</span>
                  </label>
                  <Dropzone
                    file={file}
                    onFileSelect={handleFileSelect}
                    onFileRemove={handleFileRemove}
                    disabled={isUploading || !canUpload}
                  />
                </div>

                {/* Título */}
                <div className="space-y-1.5">
                  <label htmlFor="mi-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Título
                    <span className="ml-1 text-xs text-gray-400 dark:text-gray-500 font-normal">(opcional)</span>
                  </label>
                  <input
                    id="mi-title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Nome do material instrucional"
                    maxLength={255}
                    disabled={isUploading || !canUpload}
                    className="w-full rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-2.5 text-sm
                               text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500
                               bg-white dark:bg-gray-800
                               focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30
                               disabled:bg-gray-50 dark:disabled:bg-gray-900 disabled:cursor-not-allowed
                               transition-colors"
                  />
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Se não preenchido, o nome do arquivo será usado como título.
                  </p>
                </div>

                {/* Habilidades BNCC */}
                <div className="space-y-1.5">
                  <label htmlFor="mi-habilidade" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Habilidades BNCC de Computação
                    <span className="ml-1 text-xs text-gray-400 dark:text-gray-500 font-normal">(opcional)</span>
                  </label>
                  <BnccHabilidadePicker
                    inputId="mi-habilidade"
                    selected={habilidadesBncc}
                    onAdd={addHabilidade}
                    onRemove={removeHabilidade}
                    disabled={isUploading || !canUpload}
                  />
                </div>

                {/* Projeto de destino */}
                {activeOrgs.length > 0 && (
                  <div className="space-y-1.5">
                    <label htmlFor="mi-org" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      <span className="flex items-center gap-1.5">
                        <Users size={14} className="text-gray-400 dark:text-gray-500" />
                        Destinar a um projeto
                        <span className="text-xs text-gray-400 dark:text-gray-500 font-normal">(opcional)</span>
                      </span>
                    </label>
                    <select
                      id="mi-org"
                      value={selectedOrgId}
                      onChange={(e) => setSelectedOrgId(e.target.value)}
                      disabled={isUploading || !canUpload}
                      className="w-full rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-2.5 text-sm
                                 text-gray-900 dark:text-gray-100
                                 bg-white dark:bg-gray-800
                                 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30
                                 disabled:bg-gray-50 dark:disabled:bg-gray-900 disabled:cursor-not-allowed
                                 transition-colors"
                    >
                      <option value="">Nenhum (publicação geral)</option>
                      {activeOrgs.map((org) => (
                        <option key={org.id} value={org.id}>{org.name}</option>
                      ))}
                    </select>
                    {selectedOrgId && (
                      <p className="text-xs text-indigo-600 dark:text-indigo-400">
                        O material será enviado para revisão dentro do projeto selecionado.
                      </p>
                    )}
                  </div>
                )}

                {/* Mensagem de erro */}
                {error && (
                  <div className="flex items-start gap-3 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 px-4 py-3">
                    <AlertCircle size={16} className="shrink-0 text-red-500 dark:text-red-400 mt-0.5" />
                    <p className="text-sm text-red-700 dark:text-red-400">{friendlyError(error)}</p>
                  </div>
                )}

                {/* Botão de envio */}
                <button
                  type="submit"
                  disabled={!file || isUploading || !canUpload}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3
                             text-sm font-semibold text-white
                             hover:bg-indigo-700 active:bg-indigo-800
                             disabled:opacity-50 disabled:cursor-not-allowed
                             focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900
                             transition-colors"
                >
                  {isUploading ? (
                    <>
                      <span
                        className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin"
                        aria-hidden
                      />
                      Enviando…
                    </>
                  ) : (
                    <>
                      <UploadCloud size={16} />
                      Enviar Material
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          <p className="text-center text-xs text-gray-400 dark:text-gray-500">
            Campus IV · UFPB — Rio Tinto / Mamanguape
          </p>
        </div>
    </AppShell>
  )
}
