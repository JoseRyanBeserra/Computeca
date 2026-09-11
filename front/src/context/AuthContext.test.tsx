// src/context/AuthContext.test.tsx
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { ReactNode } from 'react'
import { AuthProvider, useAuth } from './AuthContext'
import type { AuthUser } from '../types/auth'

const wrapper = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>

const user: AuthUser = {
  id: 'u1',
  name: 'Ana',
  email: 'ana@dcx.ufpb.br',
  role: 'PROFESSOR',
  canUpload: true,
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('useAuth lança erro quando usado fora do AuthProvider', () => {
    // Silencia o console.error do React ao capturar o throw de render
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(() => renderHook(() => useAuth())).toThrow(/useAuth must be used inside/)
    spy.mockRestore()
  })

  it('começa deslogado quando não há sessão no localStorage', () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeNull()
    expect(result.current.accessToken).toBeNull()
  })

  it('setSession popula o estado e persiste no localStorage', () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    act(() => result.current.setSession('token-123', user))

    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.user).toEqual(user)
    expect(result.current.accessToken).toBe('token-123')
    expect(localStorage.getItem('accessToken')).toBe('token-123')
    expect(JSON.parse(localStorage.getItem('authUser')!)).toEqual(user)
  })

  it('clearSession limpa o estado e o localStorage', () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    act(() => result.current.setSession('token-123', user))

    act(() => result.current.clearSession())

    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeNull()
    expect(localStorage.getItem('accessToken')).toBeNull()
    expect(localStorage.getItem('authUser')).toBeNull()
  })

  it('hidrata a sessão a partir do localStorage existente', () => {
    localStorage.setItem('accessToken', 'persisted')
    localStorage.setItem('authUser', JSON.stringify(user))

    const { result } = renderHook(() => useAuth(), { wrapper })

    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.user).toEqual(user)
  })
})
