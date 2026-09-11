// src/lib/api.ts
// Instância centralizada do Axios com interceptors para auth.
import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  withCredentials: true, // envia cookies (refreshToken) automaticamente
  headers: {
    'Content-Type': 'application/json',
  },
})

// ── Interceptor de request — injeta o access token em todas as chamadas ────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ── Interceptor de response — trata 401 tentando renovar o token ──────────────
api.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) return Promise.reject(error)

    const status = error.response?.status
    const originalRequest = error.config as typeof error.config & { _retry?: boolean }

    // Usuário anônimo (sem token): não tenta refresh nem redireciona para o login —
    // a página principal é pública, então apenas propaga o erro para a UI tratar.
    const hadToken = !!localStorage.getItem('accessToken')
    if (status === 401 && !hadToken) {
      return Promise.reject(error)
    }

    // Tenta refresh apenas uma vez para evitar loop infinito
    if (status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const { data } = await axios.post<{ accessToken: string }>(
          `${import.meta.env.VITE_API_URL ?? '/api'}/auth/refresh`,
          {},
          { withCredentials: true },
        )

        localStorage.setItem('accessToken', data.accessToken)
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`
        }

        return api(originalRequest)
      } catch {
        // Refresh falhou — limpa a sessão local
        localStorage.removeItem('accessToken')
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  },
)
