// src/pages/LoginPage.tsx
import { useState, type FormEvent } from 'react'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { BrandingPanel } from '../components/auth/BrandingPanel'
import { Logo } from '../components/Logo'
import { ThemeToggle } from '../components/ThemeToggle'
import { useLogin } from '../features/auth/hooks/useLogin'
import { getApiErrorMessage, getApiErrorCode } from '../lib/apiError'

// ── Mapeamento de codes → mensagens de UX mais amigáveis ──────────────────────

const UI_ERROR_MESSAGES: Partial<Record<string, string>> = {
  INVALID_CREDENTIALS: 'E-mail ou senha incorretos. Verifique os dados e tente novamente.',
  ACCOUNT_SUSPENDED: 'Esta conta foi suspensa. Entre em contato com o suporte.',
  EMAIL_NOT_VERIFIED:
    'Seu e-mail institucional ainda não foi verificado. Aguarde a confirmação antes de acessar.',
}

function resolveErrorMessage(error: unknown): string {
  const code = getApiErrorCode(error)
  if (code && UI_ERROR_MESSAGES[code]) return UI_ERROR_MESSAGES[code]!
  return getApiErrorMessage(error)
}

// ── LoginPage ──────────────────────────────────────────────────────────────────

export function LoginPage() {
  const { mutate: login, isPending, error, reset } = useLogin()
  const navigate = useNavigate()
  const location = useLocation()
  const successMessage = (location.state as { successMessage?: string } | null)?.successMessage

  const [email, setEmail]               = useState('')
  const [password, setPassword]         = useState('')
  const [showPassword, setShowPassword] = useState(false)

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    reset()
    login({ email: email.trim(), password })
  }

  const errorMessage = error ? resolveErrorMessage(error) : null

  return (
    <div className="min-h-screen flex">
      <BrandingPanel />

      {/* Toggle flutuante — canto superior direito */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                                text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700
                                shadow-sm focus:ring-indigo-500 focus:ring-offset-0" />
      </div>

      {/* ── Painel do formulário ───────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50 dark:bg-gray-950">
        <div className="w-full max-w-sm">

          {/* Logo mobile (visível apenas em telas pequenas) */}
          <div className="flex lg:hidden justify-center mb-10">
            <Logo />
          </div>

          {/* Cabeçalho do formulário */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Bem-vindo de volta</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              Entre com sua conta institucional ou pessoal
            </p>
          </div>

          {/* Alerta de sucesso (vindo do cadastro) */}
          {successMessage && (
            <div
              role="status"
              className="mb-5 flex gap-2.5 p-3.5 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-sm"
            >
              <span className="shrink-0 mt-px">✓</span>
              <span>{successMessage}</span>
            </div>
          )}

          {/* Alerta de erro */}
          {errorMessage && (
            <div
              role="alert"
              className="mb-5 flex gap-2.5 p-3.5 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm"
            >
              <span className="shrink-0 mt-px">⚠</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Formulário */}
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* E-mail */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                disabled={isPending}
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600
                           bg-white dark:bg-gray-800
                           text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-sm
                           focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                           disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:cursor-not-allowed transition"
              />
            </div>

            {/* Senha */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Senha
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={isPending}
                  className="w-full px-3.5 py-2.5 pr-10 rounded-lg border border-gray-300 dark:border-gray-600
                             bg-white dark:bg-gray-800
                             text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-sm
                             focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                             disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:cursor-not-allowed transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {/* Botão */}
            <button
              type="submit"
              disabled={isPending || !email || !password}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg
                         bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800
                         disabled:bg-indigo-300 disabled:cursor-not-allowed
                         text-white text-sm font-semibold
                         transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              {isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Entrando…
                </>
              ) : (
                'Entrar'
              )}
            </button>
          </form>

          {/* Separador */}
          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
            <span className="text-xs text-gray-400 dark:text-gray-500">ou</span>
            <span className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
          </div>

          {/* Acesso sem login — apenas visualização de materiais */}
          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-full py-2.5 px-4 rounded-lg border border-gray-300 dark:border-gray-600
                       bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-semibold
                       hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors
                       focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Explorar materiais sem login
          </button>

          {/* Rodapé do painel */}
          <p className="mt-8 text-center text-xs text-gray-400 dark:text-gray-500">
            Não tem conta?{' '}
            <Link to="/register" className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
              Cadastre-se
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
