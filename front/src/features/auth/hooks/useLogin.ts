// src/features/auth/hooks/useLogin.ts
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import { loginRequest } from '../api/authApi'
import type { LoginPayload } from '../../../types/auth'

export function useLogin() {
  const { setSession } = useAuth()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: (payload: LoginPayload) => loginRequest(payload),
    onSuccess: ({ accessToken, user }) => {
      setSession(accessToken, user)
      navigate('/', { replace: true })
    },
  })
}
