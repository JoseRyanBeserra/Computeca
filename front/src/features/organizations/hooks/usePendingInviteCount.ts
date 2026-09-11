// src/features/organizations/hooks/usePendingInviteCount.ts
import { useQuery } from '@tanstack/react-query'
import { pendingInviteCountRequest } from '../api/organizationsApi'

export function usePendingInviteCount() {
  return useQuery({
    queryKey:       ['pending-invite-count'],
    queryFn:        pendingInviteCountRequest,
    refetchInterval: 30_000,
  })
}
