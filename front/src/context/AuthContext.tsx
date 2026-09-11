// src/context/AuthContext.tsx
// Contexto de autenticação — armazena o usuário logado e o access token em memória.
// O token também é persistido em localStorage para sobreviver a refreshes de página.
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react'
import type { AuthUser } from '../types/auth'
import { queryClient } from '../lib/queryClient'

interface AuthContextValue {
  user: AuthUser | null
  accessToken: string | null
  isAuthenticated: boolean
  setSession: (token: string, user: AuthUser) => void
  clearSession: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(
    () => localStorage.getItem('accessToken'),
  )
  const [user, setUser] = useState<AuthUser | null>(() => {
    const raw = localStorage.getItem('authUser')
    return raw ? (JSON.parse(raw) as AuthUser) : null
  })

  const setSession = useCallback((token: string, authUser: AuthUser) => {
    setAccessToken(token)
    setUser(authUser)
    localStorage.setItem('accessToken', token)
    localStorage.setItem('authUser', JSON.stringify(authUser))
  }, [])

  const clearSession = useCallback(() => {
    setAccessToken(null)
    setUser(null)
    localStorage.removeItem('accessToken')
    localStorage.removeItem('authUser')
    queryClient.clear()
  }, [])

  // Sincroniza abas abertas via storage event
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'accessToken' && e.newValue === null) {
        clearSession()
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [clearSession])

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isAuthenticated: !!accessToken && !!user,
        setSession,
        clearSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
