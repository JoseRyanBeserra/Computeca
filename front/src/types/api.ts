// src/types/api.ts
// Tipos compartilhados de respostas da API MI-server

export interface ApiError {
  status: 'error'
  message: string
  code: string
}

export interface ApiValidationError {
  status: 'error'
  message: string
  issues: Record<string, string[]>
}
