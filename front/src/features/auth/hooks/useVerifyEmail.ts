// src/features/auth/hooks/useVerifyEmail.ts
import { useMutation } from '@tanstack/react-query'
import { verifyEmailRequest } from '../api/authApi'

export function useVerifyEmail() {
  return useMutation({
    mutationFn: (code: string) => verifyEmailRequest(code),
    retry: false,
  })
}
