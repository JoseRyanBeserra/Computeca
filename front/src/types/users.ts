// src/types/users.ts
import type { Role } from './auth'

/** Payload enviado para POST /users */
export interface RegisterPayload {
  name: string
  email: string
  password: string
}

/** Resposta de POST /users — espelho de CreatedUserDTO do MI-server */
export interface CreatedUser {
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
