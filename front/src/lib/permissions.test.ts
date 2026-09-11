// src/lib/permissions.test.ts
import { describe, it, expect } from 'vitest'
import {
  canUploadMaterials,
  canUseAiChat,
  isSysAdmin,
  INSTITUTIONAL_DOMAIN,
} from './permissions'
import type { AuthUser } from '../types/auth'

function makeUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: 'u1',
    name: 'Fulano',
    email: 'fulano@gmail.com',
    role: 'COMMON',
    canUpload: false,
    ...overrides,
  }
}

describe('canUploadMaterials', () => {
  it('retorna false para usuário anônimo (null)', () => {
    expect(canUploadMaterials(null)).toBe(false)
  })

  it('retorna false para usuário COMMON sem permissão e e-mail não institucional', () => {
    expect(canUploadMaterials(makeUser())).toBe(false)
  })

  it.each(['INSTITUTIONALIZED', 'PROFESSOR', 'ADMIN'] as const)(
    'retorna true para o papel %s',
    (role) => {
      expect(canUploadMaterials(makeUser({ role }))).toBe(true)
    },
  )

  it('retorna true quando canUpload é true mesmo sendo COMMON', () => {
    expect(canUploadMaterials(makeUser({ canUpload: true }))).toBe(true)
  })

  it('retorna true para e-mail institucional (case-insensitive)', () => {
    expect(canUploadMaterials(makeUser({ email: `joao${INSTITUTIONAL_DOMAIN.toUpperCase()}` }))).toBe(true)
  })
})

describe('canUseAiChat', () => {
  it('retorna false para anônimo', () => {
    expect(canUseAiChat(null)).toBe(false)
  })

  it('retorna false para COMMON comum', () => {
    expect(canUseAiChat(makeUser())).toBe(false)
  })

  it('retorna true para e-mail institucional', () => {
    expect(canUseAiChat(makeUser({ email: `ana${INSTITUTIONAL_DOMAIN}` }))).toBe(true)
  })
})

describe('isSysAdmin', () => {
  it('retorna false para null', () => {
    expect(isSysAdmin(null)).toBe(false)
  })

  it('retorna true apenas para ADMIN', () => {
    expect(isSysAdmin(makeUser({ role: 'ADMIN' }))).toBe(true)
    expect(isSysAdmin(makeUser({ role: 'PROFESSOR' }))).toBe(false)
  })
})
