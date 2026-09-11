// src/components/AppShell.tsx
// Layout base no estilo MEC RED: cabeçalho com busca + barra lateral de navegação.
// Usado por todas as telas internas para manter o estilo congruente.
import { useState, useRef, useEffect, type ReactNode, type ElementType } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Search, UploadCloud, Bell, LogOut, LogIn, Home, FileText,
  ClipboardCheck, Library, ShieldCheck, ScrollText, ChevronDown,
  Users, Mail, Menu, X, LayoutDashboard,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { ThemeToggle } from './ThemeToggle'
import { Logo } from './Logo'
import { canUploadMaterials, isSysAdmin, canManageMaterials } from '../lib/permissions'
import type { AuthUser, Role } from '../types/auth'

// ── Navegação lateral ───────────────────────────────────────────────────────────

interface NavItem {
  label: string
  icon: ElementType
  to: string
  /** Decide se o item aparece para o usuário atual (logado ou anônimo) */
  show: (user: AuthUser | null) => boolean
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Início',         icon: Home,           to: '/',                    show: () => true },
  { label: 'Publicar',       icon: UploadCloud,    to: '/upload',              show: (u) => canUploadMaterials(u) },
  { label: 'Meus Materiais', icon: FileText,       to: '/materials',           show: (u) => !!u },
  { label: 'Projetos',       icon: Users,          to: '/organizations',       show: (u) => !!u },
  { label: 'Convites',       icon: Mail,           to: '/invites',             show: (u) => !!u },
  { label: 'Painel',         icon: LayoutDashboard, to: '/admin/dashboard',    show: (u) => isSysAdmin(u) },
  { label: 'Revisar',        icon: ClipboardCheck, to: '/professor/review',    show: (u) => isSysAdmin(u) },
  { label: 'Acervo',         icon: Library,        to: '/professor/materials', show: (u) => canManageMaterials(u) },
  { label: 'Usuários',       icon: ShieldCheck,    to: '/admin/users',         show: (u) => isSysAdmin(u) },
  { label: 'Logs',           icon: ScrollText,     to: '/admin/logs',          show: (u) => isSysAdmin(u) },
]

const ROLE_LABELS: Record<Role, string> = {
  COMMON:            'Usuário',
  INSTITUTIONALIZED: 'Institucionalizado',
  PROFESSOR:         'Professor',
  ADMIN:             'Administrador',
}

function getInitials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '?'
}

// ── Sidebar ─────────────────────────────────────────────────────────────────────

function Sidebar({ user }: { user: AuthUser | null }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const items = NAV_ITEMS.filter((item) => item.show(user))

  return (
    <aside className="hidden sm:flex shrink-0 w-20 lg:w-56 flex-col gap-1 border-r border-gray-200 dark:border-gray-800
                      bg-white dark:bg-gray-900 px-2 lg:px-3 py-4">
      {items.map(({ label, icon: Icon, to }) => {
        const active = to === '/' ? pathname === '/' : pathname.startsWith(to)
        return (
          <button
            key={to}
            onClick={() => navigate(to)}
            aria-current={active ? 'page' : undefined}
            title={label}
            className={[
              'group flex items-center gap-3 rounded-xl px-2.5 lg:px-3 py-2.5 text-sm font-medium transition-colors',
              'flex-col lg:flex-row text-center lg:text-left',
              active
                ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200',
            ].join(' ')}
          >
            <Icon size={20} className="shrink-0" />
            <span className="text-[10px] lg:text-sm leading-tight">{label}</span>
          </button>
        )
      })}
    </aside>
  )
}

// ── Drawer mobile ───────────────────────────────────────────────────────────────
// Substitui a sidebar em telas < sm: painel deslizante com backdrop, fechado por
// toque fora, botão X, tecla Escape ou navegação.

function MobileDrawer({ user, open, onClose }: { user: AuthUser | null; open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  const items = NAV_ITEMS.filter((item) => item.show(user))

  return (
    <div className="fixed inset-0 z-50 sm:hidden">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Menu de navegação"
        className="absolute inset-y-0 left-0 w-64 max-w-[80vw] flex flex-col
                   bg-white dark:bg-gray-900 shadow-xl"
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-800">
          <Logo compact />
          <button
            onClick={onClose}
            aria-label="Fechar menu"
            className="rounded-lg p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800
                       transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-1">
          {items.map(({ label, icon: Icon, to }) => {
            const active = to === '/' ? pathname === '/' : pathname.startsWith(to)
            return (
              <button
                key={to}
                onClick={() => { navigate(to); onClose() }}
                aria-current={active ? 'page' : undefined}
                className={[
                  'flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors text-left',
                  active
                    ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200',
                ].join(' ')}
              >
                <Icon size={20} className="shrink-0" />
                {label}
              </button>
            )
          })}
        </nav>
      </aside>
    </div>
  )
}

// ── Menu do usuário ─────────────────────────────────────────────────────────────

function UserMenu({ name, role, onLogout }: { name: string; role: Role; onLogout: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full pl-1 pr-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors
                   focus:outline-none focus:ring-2 focus:ring-indigo-500"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="grid h-9 w-9 place-items-center rounded-full bg-indigo-600 text-white text-xs font-bold select-none">
          {getInitials(name)}
        </span>
        <ChevronDown size={15} className="hidden sm:block text-gray-400" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-56 rounded-xl border border-gray-200 dark:border-gray-700
                     bg-white dark:bg-gray-900 shadow-lg py-2 z-50"
        >
          <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{ROLE_LABELS[role]}</p>
          </div>
          <button
            onClick={onLogout}
            role="menuitem"
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300
                       hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <LogOut size={15} />
            Sair da conta
          </button>
        </div>
      )}
    </div>
  )
}

// ── AppShell ──────────────────────────────────────────────────────────────────

interface AppShellProps {
  children: ReactNode
  /** Valor controlado da busca (opcional — usado na Home para filtrar a grade) */
  searchValue?: string
  onSearchChange?: (value: string) => void
  /** Disparado ao submeter a busca; se ausente, navega para a Home */
  onSearchSubmit?: (value: string) => void
}

export function AppShell({ children, searchValue, onSearchChange, onSearchSubmit }: AppShellProps) {
  const { user, clearSession } = useAuth()
  const navigate = useNavigate()
  const [internalSearch, setInternalSearch] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)

  const value = searchValue ?? internalSearch
  const handleChange = onSearchChange ?? setInternalSearch

  function handleLogout() {
    clearSession()
    navigate('/login', { replace: true })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (onSearchSubmit) onSearchSubmit(value)
    else navigate('/')
  }

  const canPublish = canUploadMaterials(user)

  return (
    <div className="min-h-screen flex flex-col">
      <MobileDrawer user={user} open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* ── Cabeçalho ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-gray-200 dark:border-gray-800
                         bg-white/90 dark:bg-gray-900/90 backdrop-blur">
        <div className="flex items-center gap-2 sm:gap-5 px-3 sm:px-6 h-16">
          {/* Hambúrguer — abre o drawer de navegação no mobile */}
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Abrir menu"
            className="sm:hidden shrink-0 rounded-lg p-2 text-gray-600 dark:text-gray-300
                       hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors
                       focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <Menu size={22} />
          </button>

          <button onClick={() => navigate('/')} aria-label="Ir para o início" className="shrink-0 hidden sm:block">
            <Logo compact />
          </button>

          {/* Busca */}
          <form onSubmit={handleSubmit} className="flex-1 max-w-2xl flex items-center">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                value={value}
                onChange={(e) => handleChange(e.target.value)}
                placeholder="Digite aqui o que você deseja pesquisar"
                aria-label="Pesquisar materiais"
                className="w-full rounded-l-full border border-r-0 border-gray-300 dark:border-gray-700
                           bg-gray-50 dark:bg-gray-800 pl-11 pr-4 py-2.5 text-sm
                           text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500
                           focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>
            <button
              type="submit"
              aria-label="Buscar"
              className="rounded-r-full bg-indigo-500 hover:bg-indigo-600 px-4 py-2.5 text-white transition-colors
                         focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 border border-indigo-500"
            >
              <Search size={18} />
            </button>
          </form>

          {/* Ações */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {canPublish && (
              <button
                onClick={() => navigate('/upload')}
                className="hidden md:flex items-center gap-2 rounded-full bg-gray-100 dark:bg-gray-800
                           hover:bg-gray-200 dark:hover:bg-gray-700 px-4 py-2 text-sm font-semibold
                           text-gray-700 dark:text-gray-200 transition-colors
                           focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <UploadCloud size={16} />
                Publicar recurso
              </button>
            )}

            <ThemeToggle className="text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 focus:ring-indigo-500 focus:ring-offset-0" />

            {user ? (
              <>
                <button
                  aria-label="Notificações"
                  className="hidden sm:block rounded-lg p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors
                             focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <Bell size={18} />
                </button>
                <UserMenu name={user.name} role={user.role} onLogout={handleLogout} />
              </>
            ) : (
              <button
                onClick={() => navigate('/login')}
                className="flex items-center gap-2 rounded-full bg-indigo-600 hover:bg-indigo-700 px-4 py-2
                           text-sm font-semibold text-white transition-colors
                           focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
              >
                <LogIn size={16} />
                Entrar
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Corpo: sidebar + conteúdo ─────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">
        <Sidebar user={user} />
        <main className="flex-1 min-w-0 px-3 sm:px-6 lg:px-8 py-5 sm:py-8">
          {children}
        </main>
      </div>
    </div>
  )
}
