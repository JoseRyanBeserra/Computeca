// src/types/auth.ts

export type Role = 'COMMON' | 'INSTITUTIONALIZED' | 'PROFESSOR' | 'ADMIN'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: Role
  canUpload: boolean
}

export interface LoginPayload {
  email: string
  password: string
}

export interface LoginResponse {
  accessToken: string
  user: AuthUser
}

export interface RefreshResponse {
  accessToken: string
}
