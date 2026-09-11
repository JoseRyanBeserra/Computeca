// src/lib/apiError.ts
// Utilitários para extrair informações de erros Axios de forma type-safe.
import axios from 'axios'
import type { ApiError, ApiValidationError } from '../types/api'

/**
 * Extrai a mensagem de erro de uma resposta Axios.
 * Prioriza a mensagem vinda do servidor; usa fallback genérico se offline.
 */
export function getApiErrorMessage(error: unknown): string {
  if (!axios.isAxiosError(error)) return 'Ocorreu um erro inesperado.'

  if (!error.response) return 'Não foi possível conectar ao servidor. Verifique sua conexão.'

  const data = error.response.data as ApiError | ApiValidationError | undefined
  if (!data?.message) return 'Ocorreu um erro inesperado.'

  return data.message
}

/**
 * Extrai o code de erro estruturado (ex.: "INVALID_CREDENTIALS").
 * Retorna undefined se o erro não for da API ou não tiver code.
 */
export function getApiErrorCode(error: unknown): string | undefined {
  if (!axios.isAxiosError(error)) return undefined
  const data = error.response?.data as ApiError | undefined
  return data?.code
}

/**
 * Extrai erros de validação campo a campo (status 422).
 */
export function getValidationIssues(
  error: unknown,
): Record<string, string[]> | null {
  if (!axios.isAxiosError(error)) return null
  if (error.response?.status !== 422) return null
  const data = error.response.data as ApiValidationError | undefined
  return data?.issues ?? null
}
