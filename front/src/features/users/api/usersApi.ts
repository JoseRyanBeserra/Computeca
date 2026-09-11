// src/features/users/api/usersApi.ts
import { api } from '../../../lib/api'
import type { RegisterPayload, CreatedUser } from '../../../types/users'
import type { Role } from '../../../types/auth'

export async function registerRequest(payload: RegisterPayload): Promise<CreatedUser> {
  const { data } = await api.post<CreatedUser>('/users', payload)
  return data
}

// ── Admin: gestão de usuários ─────────────────────────────────────────────────

export interface AdminUser {
  id: string
  name: string
  email: string
  role: Role
  canUpload: boolean
  emailVerified: boolean
  suspended: boolean
  createdAt: string
  updatedAt: string
}

export interface ListUsersResponse {
  users: AdminUser[]
  total: number
  page: number
  perPage: number
}

export async function listUsersRequest(params?: {
  role?: Role
  page?: number
  perPage?: number
}): Promise<ListUsersResponse> {
  const query = new URLSearchParams()
  if (params?.role) query.append('role', params.role)
  if (params?.page) query.append('page', String(params.page))
  if (params?.perPage) query.append('perPage', String(params.perPage))

  const { data } = await api.get<ListUsersResponse>(`/users?${query}`)
  return data
}

export async function setUserAsProfessorRequest(userId: string): Promise<AdminUser> {
  const { data } = await api.patch<AdminUser>(`/users/${userId}/set-professor`)
  return data
}
