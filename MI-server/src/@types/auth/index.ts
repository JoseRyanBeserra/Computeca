// src/@types/auth/index.ts
import type { Role } from '@prisma/client'

/** Dados públicos do usuário autenticado — nunca contém passwordHash */
export interface IAuthUser {
  id: string
  name: string
  email: string
  role: Role
  canUpload: boolean
}

/** Resposta de POST /auth/login */
export interface ILoginResponse {
  accessToken: string
  user: IAuthUser
}

/** Resposta de POST /auth/refresh */
export interface IRefreshResponse {
  accessToken: string
}
