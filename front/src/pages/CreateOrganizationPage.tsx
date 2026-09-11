// src/pages/CreateOrganizationPage.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FolderPlus, CheckCircle2, AlertCircle } from 'lucide-react'
import { AppShell } from '../components/AppShell'
import { useCreateOrganization } from '../features/organizations/hooks/useCreateOrganization'
import { getApiErrorMessage } from '../lib/apiError'
import type { OrganizationDTO } from '../features/organizations/api/organizationsApi'

// ── SuccessState ──────────────────────────────────────────────────────────────

interface SuccessStateProps {
  org: OrganizationDTO
  onCreateAnother: () => void
}

function SuccessState({ org, onCreateAnother }: SuccessStateProps) {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center gap-6 py-8 text-center">
      <div className="rounded-full bg-green-100 dark:bg-green-950 p-5">
        <CheckCircle2 size={40} className="text-green-600 dark:text-green-400" />
      </div>
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Projeto criado!</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
          <span className="font-medium text-gray-700 dark:text-gray-300">"{org.name}"</span> foi criado
          com sucesso. Você já é o administrador.
        </p>
      </div>

      <div className="rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                      px-5 py-4 w-full text-left space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-gray-500 dark:text-gray-400">Nome</span>
          <span className="text-gray-700 dark:text-gray-300 font-medium truncate ml-4 max-w-[60%] text-right">
            {org.name}
          </span>
        </div>
        {org.description && (
          <div className="flex justify-between text-xs">
            <span className="text-gray-500 dark:text-gray-400">Descrição</span>
            <span className="text-gray-700 dark:text-gray-300 font-medium truncate ml-4 max-w-[60%] text-right">
              {org.description}
            </span>
          </div>
        )}
        <div className="flex justify-between text-xs">
          <span className="text-gray-500 dark:text-gray-400">Status</span>
          <span className="inline-flex items-center gap-1 text-green-700 dark:text-green-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            Ativa
          </span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 w-full">
        <button
          onClick={onCreateAnother}
          className="flex-1 rounded-xl border border-gray-300 dark:border-gray-600
                     bg-white dark:bg-gray-800 px-4 py-2.5 text-sm font-medium
                     text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700
                     transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500
                     focus:ring-offset-2 dark:focus:ring-offset-gray-900"
        >
          Criar outra
        </button>
        <button
          onClick={() => navigate(`/organizations/${org.id}`)}
          className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white
                     hover:bg-indigo-700 transition-colors
                     focus:outline-none focus:ring-2 focus:ring-indigo-500
                     focus:ring-offset-2 dark:focus:ring-offset-gray-900"
        >
          Ver projeto
        </button>
      </div>
    </div>
  )
}

// ── CreateOrganizationPage ────────────────────────────────────────────────────

export function CreateOrganizationPage() {
  const [name,        setName]        = useState('')
  const [description, setDescription] = useState('')

  const { mutate, isPending, isError, isSuccess, error, data, reset } = useCreateOrganization()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    mutate({ name: name.trim(), description: description.trim() || undefined })
  }

  function handleReset() {
    setName('')
    setDescription('')
    reset()
  }

  const nameError = name.trim().length > 0 && name.trim().length < 2
  const canSubmit = name.trim().length >= 2 && name.trim().length <= 100 && !isPending

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Cabeçalho */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FolderPlus size={20} className="text-indigo-600 dark:text-indigo-400" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Novo Projeto</h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Crie um projeto para agrupar materiais instrucionais e convidar membros.
          </p>
        </div>

        {/* Card principal */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">

          {/* Estado de sucesso */}
          {isSuccess && data && (
            <SuccessState org={data} onCreateAnother={handleReset} />
          )}

          {/* Formulário */}
          {!isSuccess && (
            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Nome */}
              <div className="space-y-1.5">
                <label htmlFor="org-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Nome <span className="text-red-500">*</span>
                </label>
                <input
                  id="org-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                  placeholder="ex: Projeto de Cálculo I"
                  disabled={isPending}
                  className={[
                    'w-full rounded-xl border px-4 py-2.5 text-sm',
                    'bg-white dark:bg-gray-800',
                    'text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500',
                    'focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500',
                    'disabled:bg-gray-50 dark:disabled:bg-gray-900 disabled:cursor-not-allowed transition-colors',
                    nameError
                      ? 'border-red-400 dark:border-red-600'
                      : 'border-gray-300 dark:border-gray-600',
                  ].join(' ')}
                />
                <div className="flex items-center justify-between">
                  {nameError ? (
                    <p className="text-xs text-red-500">Mínimo de 2 caracteres.</p>
                  ) : (
                    <span />
                  )}
                  <p className="text-xs text-gray-400 dark:text-gray-500 ml-auto">{name.length}/100</p>
                </div>
              </div>

              {/* Descrição */}
              <div className="space-y-1.5">
                <label htmlFor="org-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Descrição
                  <span className="ml-1 text-xs text-gray-400 dark:text-gray-500 font-normal">(opcional)</span>
                </label>
                <textarea
                  id="org-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={500}
                  rows={4}
                  placeholder="Descreva o objetivo deste projeto..."
                  disabled={isPending}
                  className={[
                    'w-full rounded-xl border px-4 py-2.5 text-sm resize-none',
                    'bg-white dark:bg-gray-800',
                    'text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500',
                    'border-gray-300 dark:border-gray-600',
                    'focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500',
                    'disabled:bg-gray-50 dark:disabled:bg-gray-900 disabled:cursor-not-allowed transition-colors',
                  ].join(' ')}
                />
                <p className="text-xs text-gray-400 dark:text-gray-500 text-right">
                  {description.length}/500
                </p>
              </div>

              {/* Erro da API */}
              {isError && (
                <div className="flex items-start gap-3 rounded-xl border border-red-200 dark:border-red-800
                                bg-red-50 dark:bg-red-950 px-4 py-3">
                  <AlertCircle size={16} className="shrink-0 text-red-500 dark:text-red-400 mt-0.5" />
                  <p className="text-sm text-red-700 dark:text-red-400">{getApiErrorMessage(error)}</p>
                </div>
              )}

              {/* Botões */}
              <div className="flex flex-col sm:flex-row gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => window.history.back()}
                  disabled={isPending}
                  className="flex-1 rounded-xl border border-gray-300 dark:border-gray-600
                             bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300
                             hover:bg-gray-50 dark:hover:bg-gray-700 px-4 py-2.5 text-sm font-medium
                             disabled:opacity-50 disabled:cursor-not-allowed transition-colors
                             focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-indigo-600
                             hover:bg-indigo-700 active:bg-indigo-800 text-white px-4 py-2.5
                             text-sm font-semibold transition-colors
                             disabled:opacity-50 disabled:cursor-not-allowed
                             focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
                             dark:focus:ring-offset-gray-900"
                >
                  {isPending ? (
                    <>
                      <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" aria-hidden />
                      Criando…
                    </>
                  ) : (
                    <>
                      <FolderPlus size={16} />
                      Criar projeto
                    </>
                  )}
                </button>
              </div>
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
