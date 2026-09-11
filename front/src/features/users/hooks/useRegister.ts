// src/features/users/hooks/useRegister.ts
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { registerRequest } from '../api/usersApi'
import type { RegisterPayload, CreatedUser } from '../../../types/users'

const INSTITUTIONAL_DOMAIN = '@dcx.ufpb.br'

export function useRegister() {
  const navigate = useNavigate()

  return useMutation({
    mutationFn: (payload: RegisterPayload) => registerRequest(payload),
    onSuccess: (user: CreatedUser) => {
      const isInstitutional = user.email.toLowerCase().endsWith(INSTITUTIONAL_DOMAIN)

      if (isInstitutional) {
        navigate('/verify-email-sent', { state: { email: user.email }, replace: true })
      } else {
        navigate('/login', {
          state: { successMessage: 'Cadastro realizado com sucesso! Faça login para continuar.' },
          replace: true,
        })
      }
    },
  })
}
