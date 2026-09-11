// src/lib/permissions.ts
// Regras de acesso do front, espelhando o que o MI-server autoriza nos endpoints.
//
//  • Materiais (visualizar)  → qualquer pessoa (página principal pública)
//  • Submeter material       → e-mail @dcx.ufpb.br (INSTITUTIONALIZED) ou ADMIN
//                              (mesma regra do middleware requireUploadPermission:
//                               role ∈ {INSTITUTIONALIZED, PROFESSOR, ADMIN} ou canUpload)
//  • Revisar / Usuários / Logs → apenas ADMIN (sysadmin)
import type { AuthUser } from '../types/auth'

export const INSTITUTIONAL_DOMAIN = '@dcx.ufpb.br'

const UPLOAD_ROLES = new Set(['INSTITUTIONALIZED', 'PROFESSOR', 'ADMIN'])

/** Pode submeter materiais instrucionais? */
export function canUploadMaterials(user: AuthUser | null): boolean {
  if (!user) return false
  return (
    UPLOAD_ROLES.has(user.role) ||
    user.canUpload ||
    user.email.toLowerCase().endsWith(INSTITUTIONAL_DOMAIN)
  )
}

/** Pode interagir com a IA (chat de materiais)? — usuários com e-mail institucional. */
export function canUseAiChat(user: AuthUser | null): boolean {
  if (!user) return false
  return (
    UPLOAD_ROLES.has(user.role) ||
    user.canUpload ||
    user.email.toLowerCase().endsWith(INSTITUTIONAL_DOMAIN)
  )
}

/** É administrador do sistema (sysadmin)? */
export function isSysAdmin(user: AuthUser | null): boolean {
  return user?.role === 'ADMIN'
}

/** Pode gerenciar materiais no acervo (ex.: soft delete)? — PROFESSOR ou ADMIN. */
export function canManageMaterials(user: AuthUser | null): boolean {
  return user?.role === 'PROFESSOR' || user?.role === 'ADMIN'
}
