// src/features/organizations/hooks/useRespondInvite.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { respondInviteRequest } from '../api/organizationsApi'

export function useRespondInvite() {
  const queryClient = useQueryClient()
  return useMutation<void, Error, { inviteId: string; action: 'ACCEPT' | 'REJECT' }>({
    mutationFn: ({ inviteId, action }) => respondInviteRequest(inviteId, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-invites'] })
      queryClient.invalidateQueries({ queryKey: ['pending-invite-count'] })
      queryClient.invalidateQueries({ queryKey: ['my-organizations'] })
    },
  })
}
