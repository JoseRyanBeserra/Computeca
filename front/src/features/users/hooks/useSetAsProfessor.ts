// src/features/users/hooks/useSetAsProfessor.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { setUserAsProfessorRequest } from '../api/usersApi'

export function useSetAsProfessor() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: string) => setUserAsProfessorRequest(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
  })
}
