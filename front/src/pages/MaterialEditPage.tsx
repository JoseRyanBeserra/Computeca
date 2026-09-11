// src/pages/MaterialEditPage.tsx
//
// Edição de um material já cadastrado. Restrita a ADMIN — a rota é guardada por
// AdminRoute, e o servidor recusa qualquer outro perfil de todo jeito.
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Save, ArrowLeft, AlertTriangle, FileUp, X } from 'lucide-react'
import { AppShell } from '../components/AppShell'
import { BnccHabilidadePicker } from '../components/BnccHabilidadePicker'
import { useMaterial } from '../features/materials/hooks/useMaterial'
import { useEditMaterial } from '../features/materials/hooks/useEditMaterial'
import { getApiErrorMessage } from '../lib/apiError'
import {
  DESCRIPTION_MIN_LENGTH,
  DESCRIPTION_MAX_LENGTH,
  TITLE_MAX_LENGTH,
} from '../features/materials/constants'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function MaterialEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: material, isLoading, isError } = useMaterial(id)
  const editMutation = useEditMaterial(id ?? '')

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [habilidadesBncc, setHabilidadesBncc] = useState<string[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [confirmandoTroca, setConfirmandoTroca] = useState(false)
  const [erro, setErro] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const preenchido = useRef(false)

  // O formulário abre com os valores atuais (FR-020). O guard evita que um
  // refetch em segundo plano descarte o que a pessoa já está digitando.
  useEffect(() => {
    if (!material || preenchido.current) return
    preenchido.current = true
    setTitle(material.title ?? '')
    setDescription(material.description ?? '')
    setHabilidadesBncc(material.habilidadesBncc ?? [])
  }, [material])

  const descricaoAparada = description.trim()
  const descricaoCurta   = descricaoAparada.length < DESCRIPTION_MIN_LENGTH
  const descricaoLonga   = descricaoAparada.length > DESCRIPTION_MAX_LENGTH
  const descricaoValida  = !descricaoCurta && !descricaoLonga
  const tituloValido     = title.trim().length > 0
  const podeSalvar       = tituloValido && descricaoValida && !editMutation.isPending

  function addHabilidade(value: string) {
    const trimmed = value.trim()
    if (!trimmed) return
    setHabilidadesBncc((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]))
  }

  function removeHabilidade(value: string) {
    setHabilidadesBncc((prev) => prev.filter((h) => h !== value))
  }

  function limparArquivo() {
    setFile(null)
    setConfirmandoTroca(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!podeSalvar) return

    // Trocar o documento apaga o anterior e não tem desfazer: a confirmação
    // acontece antes do envio, nunca depois (FR-012).
    if (file && !confirmandoTroca) {
      setConfirmandoTroca(true)
      return
    }

    salvar()
  }

  async function salvar() {
    setErro('')
    try {
      await editMutation.mutateAsync({
        title:           title.trim(),
        description:     descricaoAparada,
        habilidadesBncc: habilidadesBncc.length ? habilidadesBncc : undefined,
        ...(file ? { file } : {}),
      })
      navigate(`/materials/${id}`)
    } catch (e) {
      setConfirmandoTroca(false)
      setErro(getApiErrorMessage(e))
    }
  }

  if (isLoading) {
    return (
      <AppShell>
        <p className="text-sm text-gray-500 dark:text-gray-400">Carregando material…</p>
      </AppShell>
    )
  }

  if (isError || !material) {
    return (
      <AppShell>
        <p className="text-sm text-red-500 dark:text-red-400">
          Não foi possível carregar este material.
        </p>
      </AppShell>
    )
  }

  const eraAprovado = material.status === 'APPROVED'

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-5">
        <button
          type="button"
          onClick={() => navigate(`/materials/${id}`)}
          className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
        >
          <ArrowLeft size={15} />
          Voltar aos detalhes
        </button>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-5">
            Editar material
          </h1>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Título */}
            <div className="space-y-1.5">
              <label htmlFor="edit-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Título
                <span className="ml-1 text-xs text-red-500 font-normal">*</span>
              </label>
              <input
                id="edit-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={TITLE_MAX_LENGTH}
                disabled={editMutation.isPending}
                className="w-full rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-2.5 text-sm
                           text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800
                           focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Obrigatório, até {TITLE_MAX_LENGTH} caracteres.
              </p>
            </div>

            {/* Descrição */}
            <div className="space-y-1.5">
              <label htmlFor="edit-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Descrição
                <span className="ml-1 text-xs text-red-500 font-normal">*</span>
              </label>
              <textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva o conteúdo do material, a proposta pedagógica e a quem se destina."
                rows={6}
                maxLength={DESCRIPTION_MAX_LENGTH}
                disabled={editMutation.isPending}
                className="w-full rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-2.5 text-sm
                           text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 resize-y
                           focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
              <p className={`text-xs ${descricaoValida ? 'text-gray-400 dark:text-gray-500' : 'text-amber-600 dark:text-amber-400'}`}>
                {descricaoCurta
                  ? `Faltam ${DESCRIPTION_MIN_LENGTH - descricaoAparada.length} caracteres para o mínimo de ${DESCRIPTION_MIN_LENGTH}.`
                  : descricaoLonga
                    ? `Excedeu em ${descricaoAparada.length - DESCRIPTION_MAX_LENGTH} caracteres o máximo de ${DESCRIPTION_MAX_LENGTH}.`
                    : `${descricaoAparada.length} de ${DESCRIPTION_MAX_LENGTH} caracteres.`}
              </p>
            </div>

            {/* Habilidades BNCC */}
            <div className="space-y-1.5">
              <label htmlFor="edit-habilidade" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Habilidades BNCC de Computação
                <span className="ml-1 text-xs text-gray-400 dark:text-gray-500 font-normal">(opcional)</span>
              </label>
              <BnccHabilidadePicker
                inputId="edit-habilidade"
                selected={habilidadesBncc}
                onAdd={addHabilidade}
                onRemove={removeHabilidade}
                disabled={editMutation.isPending}
              />
            </div>

            {/* Documento */}
            <div className="space-y-1.5 border-t border-gray-200 dark:border-gray-700 pt-5">
              <label htmlFor="edit-file" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Documento
              </label>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Atual: {material.originalFileName}
                {typeof material.sizeBytes === 'number' && ` — ${formatBytes(material.sizeBytes)}`}
              </p>
              <input
                id="edit-file"
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                disabled={editMutation.isPending}
                onChange={(e) => {
                  setFile(e.target.files?.[0] ?? null)
                  setConfirmandoTroca(false)
                }}
                className="block w-full text-sm text-gray-500 dark:text-gray-400
                           file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0
                           file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700
                           dark:file:bg-indigo-900 dark:file:text-indigo-300 cursor-pointer"
              />
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Deixe em branco para manter o documento atual.
              </p>

              {file && (
                <div className="mt-2 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950 p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={15} className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                    <div className="text-xs text-amber-800 dark:text-amber-200 space-y-1">
                      <p>
                        <strong>{file.name}</strong> substituirá o documento atual.
                      </p>
                      <p>
                        O documento atual será <strong>apagado</strong> e não poderá ser
                        recuperado.
                      </p>
                      {eraAprovado && (
                        <p>
                          Este material está aprovado. Trocar o documento o devolve para
                          revisão, e ele sai do acervo público até ser aprovado de novo.
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={limparArquivo}
                    className="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300 hover:underline"
                  >
                    <X size={12} />
                    Manter o documento atual
                  </button>
                </div>
              )}
            </div>

            {confirmandoTroca && (
              <div
                role="alertdialog"
                aria-label="Confirmar substituição do documento"
                className="rounded-lg border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950 p-4 space-y-3"
              >
                <p className="text-sm text-red-800 dark:text-red-200">
                  Confirma a substituição do documento? O arquivo atual será apagado
                  definitivamente.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={salvar}
                    className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-lg"
                  >
                    <FileUp size={14} />
                    Sim, substituir
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmandoTroca(false)}
                    className="text-sm font-medium px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {erro && (
              <p className="text-sm text-red-500 dark:text-red-400">{erro}</p>
            )}

            <button
              type="submit"
              disabled={!podeSalvar}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={15} />
              {editMutation.isPending ? 'Salvando…' : 'Salvar alterações'}
            </button>
          </form>
        </div>
      </div>
    </AppShell>
  )
}
