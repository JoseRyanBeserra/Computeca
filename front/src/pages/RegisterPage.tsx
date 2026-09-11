// src/pages/RegisterPage.tsx
import { useState, type FormEvent, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff, Loader2, Info } from 'lucide-react'
import { BrandingPanel } from '../components/auth/BrandingPanel'
import { Logo } from '../components/Logo'
import { ThemeToggle } from '../components/ThemeToggle'
import { useRegister } from '../features/users/hooks/useRegister'
import { getApiErrorMessage, getApiErrorCode, getValidationIssues } from '../lib/apiError'

const INSTITUTIONAL_DOMAIN = '@dcx.ufpb.br'

// ── Erros por code da API ──────────────────────────────────────────────────────

const UI_ERROR_MESSAGES: Partial<Record<string, string>> = {
  EMAIL_ALREADY_EXISTS: 'Este e-mail já está cadastrado. Tente fazer login ou use outro endereço.',
}

function resolveApiError(error: unknown): string {
  const issues = getValidationIssues(error)
  if (issues) {
    const first = Object.values(issues).flat()[0]
    if (first) return first
  }
  const code = getApiErrorCode(error)
  if (code && UI_ERROR_MESSAGES[code]) return UI_ERROR_MESSAGES[code]!
  return getApiErrorMessage(error)
}

// ── Validação client-side (espelha regras do MI-server) ───────────────────────

interface FormValues {
  name: string
  email: string
  password: string
  confirmPassword: string
}

interface FormErrors {
  name?: string
  email?: string
  password?: string
  confirmPassword?: string
}

function validate(v: FormValues): FormErrors {
  const errors: FormErrors = {}

  if (v.name.trim().length < 2)
    errors.name = 'O nome deve ter pelo menos 2 caracteres.'

  if (!v.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email))
    errors.email = 'Informe um e-mail válido.'

  if (v.password.length < 8)
    errors.password = 'A senha deve ter pelo menos 8 caracteres.'

  if (v.confirmPassword !== v.password)
    errors.confirmPassword = 'As senhas não coincidem.'

  return errors
}

// ── Força da senha ────────────────────────────────────────────────────────────

type StrengthLevel = 'weak' | 'medium' | 'strong'

function getPasswordStrength(pwd: string): { level: StrengthLevel; label: string } | null {
  if (!pwd) return null
  const hasUpper   = /[A-Z]/.test(pwd)
  const hasNumber  = /[0-9]/.test(pwd)
  const hasSpecial = /[^A-Za-z0-9]/.test(pwd)
  const isLong     = pwd.length >= 12

  const score = [hasUpper, hasNumber, hasSpecial, isLong].filter(Boolean).length

  if (pwd.length < 8)  return { level: 'weak',   label: 'Muito curta' }
  if (score >= 3)      return { level: 'strong',  label: 'Forte' }
  if (score >= 1)      return { level: 'medium',  label: 'Média' }
  return               { level: 'weak',   label: 'Fraca' }
}

const strengthStyles: Record<StrengthLevel, { bar: string; text: string }> = {
  weak:   { bar: 'bg-red-400 w-1/3',    text: 'text-red-500' },
  medium: { bar: 'bg-yellow-400 w-2/3', text: 'text-yellow-600' },
  strong: { bar: 'bg-green-500 w-full', text: 'text-green-600' },
}

// ── Componentes internos ───────────────────────────────────────────────────────

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1 text-xs text-red-600 dark:text-red-400">{message}</p>
}

function PasswordInput({
  id,
  label,
  value,
  onChange,
  error,
  disabled,
  autoComplete,
}: {
  id: string
  label: string
  value: string
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
  error?: string
  disabled?: boolean
  autoComplete?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          onChange={onChange}
          disabled={disabled}
          placeholder="••••••••"
          className={`w-full px-3.5 py-2.5 pr-10 rounded-lg border text-sm transition
            bg-white dark:bg-gray-800
            text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500
            focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
            disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:cursor-not-allowed
            ${error
              ? 'border-red-400 bg-red-50 dark:bg-red-950 dark:border-red-700'
              : 'border-gray-300 dark:border-gray-600'}`}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          tabIndex={-1}
          aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          {show ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
      <FieldError message={error} />
    </div>
  )
}

// ── RegisterPage ──────────────────────────────────────────────────────────────

export function RegisterPage() {
  const { mutate: register, isPending, error: apiError, reset } = useRegister()

  const [values, setValues] = useState<FormValues>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [touched, setTouched] = useState<Partial<Record<keyof FormValues, boolean>>>({})
  const [submitted, setSubmitted] = useState(false)

  const errors = validate(values)
  const hasErrors = Object.keys(errors).length > 0

  const isInstitutional = values.email.toLowerCase().endsWith(INSTITUTIONAL_DOMAIN)
  const strength = getPasswordStrength(values.password)

  function set(field: keyof FormValues) {
    return (e: ChangeEvent<HTMLInputElement>) => {
      setValues((v) => ({ ...v, [field]: e.target.value }))
      if (apiError) reset()
    }
  }

  function blur(field: keyof FormValues) {
    return () => setTouched((t) => ({ ...t, [field]: true }))
  }

  function fieldError(field: keyof FormValues): string | undefined {
    return (submitted || touched[field]) ? errors[field] : undefined
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitted(true)
    if (hasErrors) return
    reset()
    register({ name: values.name.trim(), email: values.email.trim(), password: values.password })
  }

  const apiErrorMessage = apiError ? resolveApiError(apiError) : null

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

          {/* Logo mobile */}
          <div className="flex lg:hidden justify-center mb-10">
            <Logo />
          </div>

          {/* Cabeçalho */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Criar conta</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              Preencha os dados abaixo para se cadastrar
            </p>
          </div>

          {/* Alerta de erro da API */}
          {apiErrorMessage && (
            <div role="alert" className="mb-5 flex gap-2.5 p-3.5 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
              <span className="shrink-0 mt-px">⚠</span>
              <span>{apiErrorMessage}</span>
            </div>
          )}

          {/* Formulário */}
          <form onSubmit={handleSubmit} noValidate className="space-y-4">

            {/* Nome */}
            <div className="space-y-1.5">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Nome completo
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                value={values.name}
                onChange={set('name')}
                onBlur={blur('name')}
                disabled={isPending}
                placeholder="Seu nome"
                className={`w-full px-3.5 py-2.5 rounded-lg border text-sm transition
                  bg-white dark:bg-gray-800
                  text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500
                  focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                  disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:cursor-not-allowed
                  ${fieldError('name')
                    ? 'border-red-400 bg-red-50 dark:bg-red-950 dark:border-red-700'
                    : 'border-gray-300 dark:border-gray-600'}`}
              />
              <FieldError message={fieldError('name')} />
            </div>

            {/* E-mail */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={values.email}
                onChange={set('email')}
                onBlur={blur('email')}
                disabled={isPending}
                placeholder="seu@email.com"
                className={`w-full px-3.5 py-2.5 rounded-lg border text-sm transition
                  bg-white dark:bg-gray-800
                  text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500
                  focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                  disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:cursor-not-allowed
                  ${fieldError('email')
                    ? 'border-red-400 bg-red-50 dark:bg-red-950 dark:border-red-700'
                    : 'border-gray-300 dark:border-gray-600'}`}
              />
              <FieldError message={fieldError('email')} />

              {/* Aviso de e-mail institucional */}
              {isInstitutional && !fieldError('email') && (
                <div className="flex gap-2 mt-1.5 p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs">
                  <Info size={14} className="shrink-0 mt-px" />
                  <span>
                    E-mail institucional detectado. Sua conta precisará ser
                    verificada por um responsável antes do primeiro acesso.
                  </span>
                </div>
              )}
            </div>

            {/* Senha */}
            <div>
              <PasswordInput
                id="password"
                label="Senha"
                value={values.password}
                onChange={set('password')}
                error={fieldError('password')}
                disabled={isPending}
                autoComplete="new-password"
              />

              {/* Indicador de força */}
              {strength && !fieldError('password') && (
                <div className="mt-2 space-y-1">
                  <div className="h-1 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-300 ${strengthStyles[strength.level].bar}`} />
                  </div>
                  <p className={`text-xs font-medium ${strengthStyles[strength.level].text}`}>
                    Força da senha: {strength.label}
                  </p>
                </div>
              )}
            </div>

            {/* Confirmar senha */}
            <PasswordInput
              id="confirmPassword"
              label="Confirmar senha"
              value={values.confirmPassword}
              onChange={set('confirmPassword')}
              error={fieldError('confirmPassword')}
              disabled={isPending}
              autoComplete="new-password"
            />

            {/* Botão */}
            <button
              type="submit"
              disabled={isPending}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 mt-2 rounded-lg
                bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800
                disabled:bg-indigo-300 disabled:cursor-not-allowed
                text-white text-sm font-semibold
                transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              {isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Criando conta…
                </>
              ) : (
                'Criar conta'
              )}
            </button>
          </form>

          {/* Link para login */}
          <p className="mt-6 text-center text-xs text-gray-400 dark:text-gray-500">
            Já tem uma conta?{' '}
            <Link to="/login" className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
              Fazer login
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
