// src/features/organizations/hooks/useRemoveMember.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { removeMemberRequest } from '../api/organizationsApi'

export function useRemoveMember(orgId: string) {
  const queryClient = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: (userId) => removeMemberRequest(orgId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-members', orgId] })
    },
  })
}
