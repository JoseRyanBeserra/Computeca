// src/pages/VerifyEmailSentPage.tsx
import { useState, type FormEvent } from 'react'
import { Link, useLocation, Navigate } from 'react-router-dom'
import { Mail, CheckCircle, Loader2 } from 'lucide-react'
import { Logo } from '../components/Logo'
import { ThemeToggle } from '../components/ThemeToggle'
import { useVerifyEmail } from '../features/auth/hooks/useVerifyEmail'
import { getApiErrorMessage } from '../lib/apiError'

// ── Estados pós-verificação ───────────────────────────────────────────────────

function SuccessState() {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="bg-green-50 dark:bg-green-950 rounded-full p-4">
        <CheckCircle size={32} className="text-green-500 dark:text-green-400" />
      </div>
      <div>
        <p className="font-bold text-gray-900 dark:text-gray-100 text-lg">E-mail verificado!</p>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 leading-relaxed">
          Sua conta institucional foi ativada com sucesso.
        </p>
      </div>
      <Link
        to="/login"
        className="w-full flex items-center justify-center py-2.5 px-4 rounded-lg
                   bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800
                   text-white text-sm font-semibold transition-colors
                   focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
      >
        Ir para o login
      </Link>
    </div>
  )
}

// ── VerifyEmailSentPage ───────────────────────────────────────────────────────

export function VerifyEmailSentPage() {
  const location = useLocation()
  const email    = (location.state as { email?: string } | null)?.email

  const [code, setCode] = useState('')

  const { mutate: verify, isPending, isSuccess, isError, error, reset } = useVerifyEmail()

  if (!email) return <Navigate to="/register" replace />

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (code.trim().length !== 6) return
    reset()
    verify(code.trim())
  }

  function handleCodeChange(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 6)
    setCode(digits)
    if (isError) reset()
  }

  const errorMessage = isError ? getApiErrorMessage(error) : null

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-6">

      {/* Toggle flutuante — canto superior direito */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                                text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700
                                shadow-sm focus:ring-indigo-500 focus:ring-offset-0" />
      </div>

      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex justify-center mb-10">
          <Logo />
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-8 shadow-sm">
          {isSuccess ? <SuccessState /> : (
            <div className="flex flex-col items-center gap-5 text-center">

              <div className="bg-indigo-50 dark:bg-indigo-950 rounded-full p-4">
                <Mail size={28} className="text-indigo-600 dark:text-indigo-400" />
              </div>

              <div>
                <p className="font-bold text-gray-900 dark:text-gray-100 text-lg">Verifique seu e-mail</p>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1.5 leading-relaxed">
                  Enviamos um código de 6 dígitos para{' '}
                  <span className="font-medium text-gray-700 dark:text-gray-300 break-all">{email}</span>.
                </p>
              </div>

              {/* Formulário do código */}
              <form onSubmit={handleSubmit} className="w-full space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 text-left">
                    Código de verificação
                  </label>
                  <input
                    id="code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="000000"
                    value={code}
                    onChange={(e) => handleCodeChange(e.target.value)}
                    disabled={isPending}
                    maxLength={6}
                    className={`w-full px-4 py-3 rounded-lg border text-center text-2xl font-bold tracking-[0.5em] transition
                                bg-white dark:bg-gray-800
                                text-gray-900 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-600
                                focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                                disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:cursor-not-allowed
                                ${isError
                                  ? 'border-red-400 bg-red-50 dark:bg-red-950 dark:border-red-700'
                                  : 'border-gray-300 dark:border-gray-600'}`}
                  />
                  {errorMessage && (
                    <p role="alert" className="text-xs text-red-600 dark:text-red-400 text-left">
                      {errorMessage}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isPending || code.length !== 6}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg
                             bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800
                             disabled:bg-indigo-300 disabled:cursor-not-allowed
                             text-white text-sm font-semibold transition-colors
                             focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  {isPending ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Verificando…
                    </>
                  ) : (
                    'Confirmar código'
                  )}
                </button>
              </form>

              <div className="w-full bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-amber-700 dark:text-amber-400 text-xs text-left space-y-1">
                <p className="font-semibold">Não recebeu o código?</p>
                <ul className="list-disc list-inside space-y-0.5 text-amber-600 dark:text-amber-500">
                  <li>Verifique a pasta de spam.</li>
                  <li>O código expira em 24 horas.</li>
                </ul>
              </div>

              <Link to="/login" className="text-xs text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                Voltar para o login
              </Link>

            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-gray-400 dark:text-gray-500">
          Campus IV · UFPB — Rio Tinto / Mamanguape
        </p>
      </div>
    </div>
  )
}
